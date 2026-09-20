"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Phone, Send, Volume2 } from "lucide-react";
import { DEEPGRAM_VOICES, recognizeSpeech } from "@/lib/support-data";

export function LostVoice() {
  return (
    <div className="support-columns">
      <WhisperToLoud />
      <CallProxy />
      <LiveCallAgent />
    </div>
  );
}

type CallStatus = {
  status: string;
  question?: string | null;
  transcript?: { role: string; content: string }[];
};

function LiveCallAgent() {
  const [phone, setPhone] = useState("");
  const [studentName, setStudentName] = useState("");
  const [purpose, setPurpose] = useState("Ask for the soonest available appointment");
  const [details, setDetails] = useState("");
  const [consent, setConsent] = useState(false);
  const [callSid, setCallSid] = useState("");
  const [call, setCall] = useState<CallStatus | null>(null);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("Set up your call, then connect when ready.");

  useEffect(() => {
    if (!callSid) return;
    const poll = async () => {
      const res = await fetch("/api/live-call/" + encodeURIComponent(callSid), { cache: "no-store" });
      const data = (await res.json()) as CallStatus & { error?: string };
      if (res.ok) {
        setCall(data);
        setStatus(data.status === "needs your input" ? "The agent needs your answer." : "Call " + data.status + ".");
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2500);
    return () => window.clearInterval(interval);
  }, [callSid]);

  const startCall = async () => {
    if (!consent) {
      setStatus("Confirm that the recipient has consented to this AI-assisted call.");
      return;
    }
    setStatus("Asking Twilio to place the call…");
    const res = await fetch("/api/live-call/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: phone,
        context: { student_name: studentName, purpose, details },
      }),
    });
    const data: { call_sid?: string; error?: string } = await res.json();
    if (!res.ok || !data.call_sid) {
      setStatus(data.error || "Could not start the call.");
      return;
    }
    setCallSid(data.call_sid);
    setStatus("Calling… keep this page open to see the live status.");
  };

  const sendAnswer = async () => {
    if (!callSid || !answer.trim()) return;
    const res = await fetch("/api/live-call/" + encodeURIComponent(callSid) + "/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    const data: { error?: string } = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Could not send your answer.");
      return;
    }
    setAnswer("");
    setStatus("Your answer was sent to the agent.");
  };

  return (
    <section className="panel live-call-panel">
      <div className="panel-heading">
        <div>
          <h2>3. Live call agent</h2>
          <p>Deepgram speaks and listens on an outbound phone call while you stay in control here.</p>
        </div>
      </div>
      <label className="field-label" htmlFor="live-number">Recipient phone number</label>
      <input id="live-number" className="text-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+16175551212" inputMode="tel" />
      <label className="field-label" htmlFor="live-name">Your name (optional)</label>
      <input id="live-name" className="text-input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Kira" />
      <label className="field-label" htmlFor="live-purpose">What should the call accomplish?</label>
      <input id="live-purpose" className="text-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      <label className="field-label" htmlFor="live-details">Context the agent may use</label>
      <textarea id="live-details" className="text-input" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Example: I have had a fever and sore throat for two days. Ask about the earliest appointment. If they need insurance or a date I did not provide, ask me in this page." />
      <label className="live-call-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I have permission to place this AI-assisted call and will use a verified recipient on my Twilio trial.</label>
      <div className="support-actions">
        <button className="button primary" onClick={startCall} disabled={!phone || !purpose || !details || !!callSid}><Phone size={15} /> Start live call</button>
      </div>
      <p className="status-message">{status}</p>
      {call?.question && (
        <div className="live-call-question">
          <strong>Agent asks:</strong> {call.question}
          <textarea className="text-input" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the information or decision for the agent." />
          <button className="button" onClick={sendAnswer} disabled={!answer.trim()}><Send size={15} /> Send to agent</button>
        </div>
      )}
      {!!call?.transcript?.length && <div className="live-call-transcript">{call.transcript.slice(-4).map((turn, index) => <p key={index}><strong>{turn.role}:</strong> {turn.content}</p>)}</div>}
      <p className="support-hint">For consented calls only. This is communication support, not medical advice; contact campus health or emergency services when appropriate.</p>
    </section>
  );
}

function WhisperToLoud() {
  const [text, setText] = useState(
    "I’m not feeling well and need a moment to explain.",
  );
  const [status, setStatus] = useState("");

  const listen = () => {
    const started = recognizeSpeech(
      (heard) => {
        setText(heard);
        setStatus("Heard: “" + heard + "”");
      },
      () =>
        setStatus("I could not hear that. You can type your message instead."),
    );
    setStatus(
      started
        ? "Listening… whisper your message."
        : "Voice transcription is not supported in this browser. Type instead, then press Speak aloud.",
    );
  };
  const speak = () => {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>1. Whisper-to-loud</h2>
          <p>
            Whisper into your computer or type the message. Your computer speaks
            it at normal volume.
          </p>
        </div>
      </div>
      <label className="field-label" htmlFor="whisper-text">
        Message
      </label>
      <textarea
        id="whisper-text"
        className="text-input"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="support-actions">
        <button className="button" onClick={listen}>
          <Mic size={15} /> Whisper into computer
        </button>
        <button className="button primary" onClick={speak}>
          <Volume2 size={15} /> Speak aloud
        </button>
      </div>
      <p className="status-message">{status}</p>
    </section>
  );
}

function CallProxy() {
  const [context, setContext] = useState(
    "I am calling a doctor. I have a fever and sore throat. Ask for the soonest available appointment.",
  );
  const [caller, setCaller] = useState("");
  const [draft, setDraft] = useState(
    "Hello, this is {your name}. I’m calling to ask about the soonest available appointment.",
  );
  const [status, setStatus] = useState(
    "Ready — record the caller or type what they said.",
  );
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState(DEEPGRAM_VOICES[0].id);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const speak = async (text: string) => {
    setStatus("Deepgram is speaking…");
    try {
      const res = await fetch("/api/lost-voice/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        throw new Error(data.error);
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      setStatus("Playing Deepgram Aura voice.");
    } catch (e) {
      setStatus(
        e instanceof Error && e.message
          ? e.message
          : "Could not play Deepgram speech.",
      );
    }
  };

  const compose = async (raw: string) => {
    if (!raw.trim()) return;
    setStatus("Writing an editable reply…");
    try {
      const res = await fetch("/api/lost-voice/compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, caller: raw }),
      });
      const data: { say?: string; source?: string; error?: string } =
        await res.json();
      if (!res.ok || !data.say) throw new Error(data.error);
      setDraft(data.say);
      setStatus(
        data.source === "openai"
          ? "Reply drafted with OpenAI. Edit it before speaking."
          : "Fallback reply drafted — OpenAI is unavailable.",
      );
    } catch (e) {
      setStatus(
        e instanceof Error && e.message
          ? e.message
          : "Could not draft a reply.",
      );
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setStatus("Deepgram is transcribing the caller…");
        try {
          const blob = new Blob(chunks.current, {
            type: r.mimeType || "audio/webm",
          });
          const res = await fetch("/api/lost-voice/transcribe", {
            method: "POST",
            headers: { "content-type": blob.type },
            body: blob,
          });
          const data: { transcript?: string; error?: string } =
            await res.json();
          if (!res.ok || typeof data.transcript !== "string")
            throw new Error(data.error);
          setCaller(data.transcript);
          await compose(data.transcript);
        } catch (e) {
          setStatus(
            e instanceof Error && e.message
              ? e.message
              : "Could not transcribe this recording.",
          );
        }
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      setStatus("Listening to caller — press Stop listening when they finish.");
    } catch {
      setStatus(
        "Microphone access was not granted. Type the caller’s words instead.",
      );
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>2. Phone-call proxy</h2>
          <p>
            Put your phone on speaker near the laptop. Record one caller turn,
            let Deepgram transcribe it, then review and play the editable
            response.
          </p>
        </div>
      </div>
      <label className="field-label" htmlFor="call-context">
        General overview before the call
      </label>
      <textarea
        id="call-context"
        className="text-input"
        rows={3}
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />
      <label className="field-label" htmlFor="call-caller">
        Caller’s last words
      </label>
      <textarea
        id="call-caller"
        className="text-input"
        rows={3}
        value={caller}
        onChange={(e) => setCaller(e.target.value)}
        placeholder="Type what they said, or record it below."
      />
      <div className="support-actions">
        <button className="button primary" onClick={toggleRecord}>
          <Mic size={15} />
          {recording ? "Stop listening" : "Listen to caller"}
        </button>
        <button className="button" onClick={() => compose(caller)}>
          Draft typed reply
        </button>
      </div>
      <p className="status-message">{status}</p>
      <label className="field-label" htmlFor="call-voice">
        Deepgram voice
      </label>
      <select
        id="call-voice"
        className="text-input"
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
      >
        {DEEPGRAM_VOICES.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <label className="field-label" htmlFor="call-draft">
        Edit the computer’s spoken reply
      </label>
      <textarea
        id="call-draft"
        className="text-input"
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Edit names, dates, or placeholders such as {your name}."
      />
      <div className="support-actions">
        <button className="button primary" onClick={() => speak(draft)}>
          <Volume2 size={15} /> Speak with Deepgram
        </button>
      </div>
    </section>
  );
}
