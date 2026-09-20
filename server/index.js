import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Database from 'better-sqlite3'
import pdf from 'pdf-parse'
import twilio from 'twilio'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
fs.mkdirSync('data',{recursive:true})
const app = express(), db = new Database('data/freshman-flu.db')
db.pragma('journal_mode = WAL')
db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT UNIQUE, password TEXT, credits INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS food_requests (id INTEGER PRIMARY KEY, requester_id INTEGER, title TEXT, spot TEXT, cost INTEGER, note TEXT, status TEXT DEFAULT 'open', volunteer_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY, user_id INTEGER, date TEXT, symptoms TEXT, energy INTEGER, note TEXT);
CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, body TEXT, symptoms TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS replies (id INTEGER PRIMARY KEY, post_id INTEGER, user_id INTEGER, body TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS syllabi (id INTEGER PRIMARY KEY, user_id INTEGER, course TEXT, text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS call_scripts (id INTEGER PRIMARY KEY, text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`)
if (!db.prepare('SELECT COUNT(*) as n FROM users').get().n) {
  db.prepare('INSERT INTO users (name,password,credits) VALUES (?,?,?)').run('Student','demo',120)
  db.prepare('INSERT INTO users (name,password,credits) VALUES (?,?,?)').run('Volunteer','demo',40)
  db.prepare('INSERT INTO posts (user_id,title,body,symptoms) VALUES (1,?,?,?)').run('Anyone know a low-energy way to catch up after missing class?','I’m sick this week and trying to prioritize what absolutely cannot wait.','fatigue,sore throat')
}
app.use(cors()); app.use(express.json({ limit: '6mb' }))
const users = () => db.prepare('SELECT id,name,credits FROM users').all()
app.get('/api/users', (_,res)=>res.json(users()))
app.post('/api/login', (req,res)=>{ const u=db.prepare('SELECT id,name,credits FROM users WHERE name=? AND password=?').get(req.body.name,req.body.password); u?res.json(u):res.status(401).json({error:'Try Student / demo or Volunteer / demo'}) })
app.get('/api/requests', (_,res)=>res.json(db.prepare(`SELECT r.*, u.name requester, v.name volunteer FROM food_requests r JOIN users u ON u.id=r.requester_id LEFT JOIN users v ON v.id=r.volunteer_id ORDER BY r.id DESC`).all()))
app.post('/api/requests', (req,res)=>{ const {userId,title,spot,cost,note}=req.body; const x=db.prepare('INSERT INTO food_requests (requester_id,title,spot,cost,note) VALUES (?,?,?,?,?)').run(userId,title,spot,Number(cost),note); res.json({id:x.lastInsertRowid}) })
app.post('/api/requests/:id/claim', (req,res)=>{ const r=db.prepare('SELECT * FROM food_requests WHERE id=?').get(req.params.id), volunteer=Number(req.body.userId); if(!r||r.status!=='open') return res.status(409).json({error:'This request is no longer available.'}); const requester=db.prepare('SELECT credits FROM users WHERE id=?').get(r.requester_id); if(requester.credits<r.cost) return res.status(400).json({error:'Requester does not have enough mock credits.'}); const tx=db.transaction(()=>{db.prepare('UPDATE users SET credits=credits-? WHERE id=?').run(r.cost,r.requester_id);db.prepare('UPDATE users SET credits=credits+? WHERE id=?').run(r.cost,volunteer);db.prepare("UPDATE food_requests SET status='claimed', volunteer_id=? WHERE id=?").run(volunteer,r.id)}); tx(); res.json({ok:true,users:users()}) })
app.get('/api/checkins/:userId', (req,res)=>res.json(db.prepare('SELECT * FROM checkins WHERE user_id=? ORDER BY date DESC,id DESC').all(req.params.userId)))
app.post('/api/checkins', (req,res)=>{ const {userId,symptoms,energy,note}=req.body; db.prepare('INSERT INTO checkins (user_id,date,symptoms,energy,note) VALUES (?,?,?,?,?)').run(userId,new Date().toISOString().slice(0,10),symptoms.join(','),energy,note);res.json({ok:true}) })
app.get('/api/posts', (_,res)=>res.json(db.prepare(`SELECT p.*,u.name, (SELECT COUNT(*) FROM replies WHERE post_id=p.id) replies FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC`).all()))
app.post('/api/posts', (req,res)=>{ const {userId,title,body,symptoms}=req.body; db.prepare('INSERT INTO posts (user_id,title,body,symptoms) VALUES (?,?,?,?)').run(userId,title,body,symptoms);res.json({ok:true}) })
app.get('/api/posts/:id/replies', (req,res)=>res.json(db.prepare('SELECT r.*,u.name FROM replies r JOIN users u ON u.id=r.user_id WHERE post_id=? ORDER BY r.id').all(req.params.id)))
app.post('/api/posts/:id/replies', (req,res)=>{db.prepare('INSERT INTO replies (post_id,user_id,body) VALUES (?,?,?)').run(req.params.id,req.body.userId,req.body.body);res.json({ok:true})})
const analyze = text => { const t=text.toLowerCase(); const strict=/no makeup|cannot be made up|no late work|not accepted/.test(t), flexible=/make-up|makeup|extension|accommodat/.test(t); return {risk:strict?'High':flexible?'Low':'Medium', attendance:strict?'Attendance language appears strict; missed in-class work may not be recoverable.':flexible?'The policy appears to allow communication and possible accommodations.':'Review the course policy with your instructor; the text does not state a clear guarantee.', late:strict?'Late work appears restricted or unavailable.':flexible?'Extensions or make-up work may be possible when requested promptly.':'No clear late-work rule was detected.', action:'Email your instructor before class if possible, name the affected date, and ask which items need attention first.', assignments:[{name:'Next required submission',priority:strict?'High stakes':'Check policy',why:strict?'Potentially no makeup / late credit.':'Confirm deadline and flexibility.'},{name:'Readings / participation',priority:'Lower stakes',why:'Do what your energy allows; communicate early.'}] } }
async function analyzeWithOpenAI(text){
  if(!process.env.OPENAI_API_KEY) return analyze(text)
  try { const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},messages:[{role:'system',content:'You are Academic Navigator for a student-support demo. Extract only stated attendance, late-work, and makeup policies. Never invent policy or give medical advice. Return JSON with risk (High, Medium, Low), attendance, late, action, assignments [{name,priority,why}].'},{role:'user',content:text.slice(0,24000)}]})}); const d=await r.json(); return JSON.parse(d.choices?.[0]?.message?.content)||analyze(text) }catch{return analyze(text)}
}
app.post('/api/syllabus', express.raw({type:'application/pdf',limit:'15mb'}), async(req,res)=>{ try { const data=await pdf(req.body); res.json({text:data.text,analysis:await analyzeWithOpenAI(data.text)}); } catch {res.status(400).json({error:'Could not extract this PDF. Use the paste-text fallback.'})} })
app.post('/api/syllabus/text', async(req,res)=>{ const {userId,course,text}=req.body; db.prepare('INSERT INTO syllabi (user_id,course,text) VALUES (?,?,?)').run(userId,course,text);res.json({analysis:await analyzeWithOpenAI(text)}) })
const env = key => (process.env[key] || '').trim()
const E164=/^\+[1-9]\d{7,14}$/
const publicBase=value=>{ try { const url=new URL(value); return url.protocol==='https:'&&url.hostname&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash ? url.origin : '' } catch { return '' } }
app.get('/api/config', (_,res)=>{const deepgram=Boolean(env('DEEPGRAM_API_KEY')),twilioAccount=Boolean(env('TWILIO_ACCOUNT_SID')&&env('TWILIO_AUTH_TOKEN')),twilioFromNumber=E164.test(env('TWILIO_PHONE_NUMBER')),twilioPublicUrl=Boolean(publicBase(env('TWILIO_PUBLIC_URL')));res.json({deepgram,openai:Boolean(env('OPENAI_API_KEY')),twilioAccount,twilioFromNumber,twilioPublicUrl,twilioVoiceAgent:deepgram&&twilioAccount&&twilioFromNumber&&twilioPublicUrl})})
app.post('/api/call', async(req,res)=>{
  const {to,text}=req.body
  const accountSid = env('TWILIO_ACCOUNT_SID')
  const authToken = env('TWILIO_AUTH_TOKEN')
  const from = env('TWILIO_PHONE_NUMBER')
  const rawPublicUrl = env('TWILIO_PUBLIC_URL')
  const publicUrl = publicBase(rawPublicUrl)
  if(!accountSid||!authToken) return res.status(503).json({error:'Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env, then restart the server.'})
  if(!E164.test(from)) return res.status(503).json({error:'Add TWILIO_PHONE_NUMBER to .env in E.164 format, e.g. +16175551212, then restart the server.'})
  if(!rawPublicUrl) return res.status(503).json({error:'Add TWILIO_PUBLIC_URL (your public HTTPS ngrok URL) to .env, then restart the server.'})
  if(!publicUrl) return res.status(503).json({error:'TWILIO_PUBLIC_URL must be a public HTTPS base URL with no path, e.g. https://your-name.ngrok-free.app'})
  if(!E164.test(to||'')) return res.status(400).json({error:'Use a full phone number in E.164 format, e.g. +16175551212.'})
  const safeText=String(text||'').slice(0,1600)
  if(!safeText.trim()) return res.status(400).json({error:'Add the message you want the call to speak.'})
  try { const script=db.prepare('INSERT INTO call_scripts (text) VALUES (?)').run(safeText); const client=twilio(accountSid,authToken); const call=await client.calls.create({to,from,url:`${publicUrl}/api/twiml/${script.lastInsertRowid}`}); res.json({ok:true,sid:call.sid}) }
  catch(err){console.error('Twilio call failed', {status:err.status,code:err.code,message:err.message});res.status(400).json({error:err.message||'Twilio could not place the call.',code:err.code,status:err.status})}
})
const xmlEscape = text => String(text).replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]))
app.all('/api/twiml/:id',(req,res)=>{const script=db.prepare('SELECT text FROM call_scripts WHERE id=?').get(req.params.id);if(!script)return res.status(404).type('text/xml').send('<Response><Say>Call script unavailable.</Say></Response>');const publicUrl=publicBase(env('TWILIO_PUBLIC_URL'));if(env('DEEPGRAM_API_KEY')&&publicUrl){const streamUrl=publicUrl.replace(/^https:/,'wss:').replace(/^http:/,'ws:');return res.type('text/xml').send(`<Response><Say voice="Polly.Joanna" language="en-US">Connecting your voice assistant.</Say><Connect><Stream url="${streamUrl}/api/media/${req.params.id}" /></Connect></Response>`)}res.type('text/xml').send(`<Response><Say voice="Polly.Joanna" language="en-US">${xmlEscape(script.text)}</Say></Response>`)})
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist'); app.use(express.static(root)); app.get('*',(_,res)=>res.sendFile(path.join(root,'index.html')))
function agentSettings(context){
  return {type:'Settings',audio:{input:{encoding:'mulaw',sample_rate:8000},output:{encoding:'mulaw',sample_rate:8000,container:'none'}},agent:{language:'en',listen:{provider:{type:'deepgram',version:'v2',model:'flux-general-en'}},think:{provider:{type:'open_ai',model:'gpt-4o-mini',temperature:0.4},prompt:`You are Freshman Flu Voice Coach, a concise phone-call assistant for a sick MIT student. Help the student communicate clearly with campus health, a doctor's office, student services, a roommate, or a professor. Keep every spoken turn to one or two short sentences. Ask one question at a time. Do not diagnose, prescribe medication, give dosing, or claim to be a clinician. If symptoms sound urgent, advise contacting emergency services or MIT Medical. The student supplied this context before the call: ${context}`},speak:{provider:{type:'deepgram',version:'v2',model:'flux-alexis-en'}},greeting:'Hi, I am your Freshman Flu voice coach. Tell me who we are calling and what you need help saying.'},tags:['freshman-flu','twilio','voice-agent']}
}
function bridgeMedia(twilioWs, scriptId){
  const script=db.prepare('SELECT text FROM call_scripts WHERE id=?').get(scriptId)
  const dgKey=env('DEEPGRAM_API_KEY')
  if(!script||!dgKey){twilioWs.close();return}
  let streamSid='',dgReady=false,mark=0
  const pending=[]
  const dg=new WebSocket('wss://agent.deepgram.com/v1/agent/converse',{headers:{Authorization:`Token ${dgKey}`}})
  const sendToTwilio = obj => { if(twilioWs.readyState===WebSocket.OPEN) twilioWs.send(JSON.stringify(obj)) }
  const sendAudioToTwilio = data => { if(!streamSid)return;sendToTwilio({event:'media',streamSid,media:{payload:Buffer.from(data).toString('base64')}});sendToTwilio({event:'mark',streamSid,mark:{name:`dg-${++mark}`}}) }
  dg.on('open',()=>{dgReady=true;dg.send(JSON.stringify(agentSettings(script.text)));while(pending.length)dg.send(pending.shift())})
  dg.on('message',(data,isBinary)=>{if(isBinary)return sendAudioToTwilio(data);try{const msg=JSON.parse(data.toString());const type=msg.type||msg.event||'';if(type==='UserStartedSpeaking'||type==='User Started Speaking'||type==='AgentV1UserStartedSpeaking')sendToTwilio({event:'clear',streamSid});if(type==='ConversationText')console.log('Deepgram conversation:', msg.role, msg.content)}catch{}})
  dg.on('error',err=>console.error('Deepgram voice agent failed', err.message))
  twilioWs.on('message',raw=>{try{const msg=JSON.parse(raw.toString());if(msg.event==='start')streamSid=msg.start?.streamSid||msg.streamSid;if(msg.event==='media'){const audio=Buffer.from(msg.media.payload,'base64');dgReady&&dg.readyState===WebSocket.OPEN?dg.send(audio):pending.push(audio)}if(msg.event==='stop')dg.close()}catch(err){console.error('Twilio media bridge failed', err.message)}})
  twilioWs.on('close',()=>{if(dg.readyState===WebSocket.OPEN||dg.readyState===WebSocket.CONNECTING)dg.close()})
}
const server=http.createServer(app), mediaServer=new WebSocketServer({noServer:true})
server.on('upgrade',(req,socket,head)=>{const match=req.url?.match(/^\/api\/media\/(\d+)/);if(!match)return socket.destroy();mediaServer.handleUpgrade(req,socket,head,ws=>bridgeMedia(ws,match[1]))})
server.listen(process.env.PORT||3001,()=>console.log('Freshman Flu running on http://localhost:3001'))
