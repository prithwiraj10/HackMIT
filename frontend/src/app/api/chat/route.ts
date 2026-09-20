import { TOOL_DEFS, runTool, type ToolCallRecord } from "@/lib/chat-tools";
import { BodyTooLarge, readJsonBounded } from "@/lib/bounded-body";

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_ROUNDS = 6;
const MAX_HISTORY = 24;
const MAX_MESSAGE = 4000;
// message (UTF-8 worst case) + sessionId + JSON framing.
const MAX_BODY_BYTES = 32 * 1024;

const SYSTEM_PROMPT = `You are the analysis assistant for a deterministic SEITR epidemic simulation of a fictional flu outbreak across 32 MIT campus buildings (8,515 modeled people, 21 days, baseline parameters beta=0.45, incub=2d, inf=3d, iso=5d, fracT=0.6, decay=350m, cross=0.25).

Rules:
- Answer ONLY from data returned by tool calls. Never invent numbers, transmission mechanisms, or intervention effects the tools did not return.
- If a requested metric or capability is not tracked by the model (e.g. airborne-vs-contact split, ventilation rates, mask compliance per room, individual people), say so explicitly instead of guessing.
- Cite the building(s) and parameters each answer is based on, so the user can trace it to a simulation result.
- When the user asks about a specific day, pass that day to the tool (e.g. get_room_parameters day=0) and report the day the tool result actually contains; never relabel numbers from another day.
- Frame everything as simulation-based findings, never real-world medical or public-health advice.
- Interpret everyday asks concretely: "hand sanitizer stations" → contact_scale on the worst buildings; "mask mandate" → lower beta and/or cross campus-wide; "curb infection in room X" → contact_scale plus params on that room; "when to act" → simulate_intervention_timing over several trigger days.
- The simulation is uncalibrated and synthetic — keep that caveat when recommending actions.
- Be concise; lead with the answer, then the supporting numbers.`;

// Per-session conversation history. In-memory for now; the Map boundary is
// where Redis/DB persistence would slot in later.
const sessions = new Map<string, Message[]>();
const MAX_SESSIONS = 500;
const SESSION_TTL_MS = 60 * 60 * 1000;
const lastSeen = new Map<string, number>();

function loadSession(id: string) {
  const seen = lastSeen.get(id);
  if (seen === undefined || Date.now() - seen > SESSION_TTL_MS) {
    sessions.delete(id);
    lastSeen.delete(id);
    return [];
  }
  return [...(sessions.get(id) ?? [])];
}

function saveSession(id: string, history: Message[]) {
  const now = Date.now();
  for (const [key, seen] of lastSeen)
    if (now - seen > SESSION_TTL_MS) {
      sessions.delete(key);
      lastSeen.delete(key);
    }
  sessions.delete(id);
  lastSeen.delete(id);
  while (sessions.size >= MAX_SESSIONS) {
    const oldest = lastSeen.keys().next().value;
    if (oldest === undefined) break;
    sessions.delete(oldest);
    lastSeen.delete(oldest);
  }
  sessions.set(id, trimmed(history));
  lastSeen.set(id, now);
}

// Drop old turns without orphaning a tool result from the assistant call that
// requested it — OpenAI rejects tool messages with no matching tool_calls.
function trimmed(messages: Message[]) {
  let start = Math.max(0, messages.length - MAX_HISTORY);
  while (start < messages.length) {
    const m = messages[start];
    if (m.role === "tool" || (m.role === "assistant" && m.tool_calls?.length)) {
      start++;
      continue;
    }
    break;
  }
  return messages.slice(start);
}

async function callOpenAI(messages: Message[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOL_DEFS,
      tool_choice: "auto",
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && body.error?.message
        ? String(body.error.message)
        : `OpenAI API error ${res.status}`;
    throw new Error(detail);
  }
  return body?.choices?.[0]?.message as Message | undefined;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY)
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is not set. Add it to frontend/.env.local and restart the dev server.",
      },
      { status: 503 },
    );
  let payload: { message?: unknown; sessionId?: unknown };
  try {
    const parsed = await readJsonBounded(request, MAX_BODY_BYTES);
    if (!parsed || typeof parsed !== "object")
      return Response.json({ error: "Expected a JSON body." }, { status: 400 });
    payload = parsed;
  } catch (err) {
    if (err instanceof BodyTooLarge)
      return Response.json(
        { error: `message is limited to ${MAX_MESSAGE} characters.` },
        { status: 413 },
      );
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const message = payload.message;
  if (typeof message !== "string" || !message.trim())
    return Response.json(
      { error: "message must be a non-empty string." },
      { status: 400 },
    );
  if (message.length > MAX_MESSAGE)
    return Response.json(
      { error: `message is limited to ${MAX_MESSAGE} characters.` },
      { status: 400 },
    );
  const sessionId =
    typeof payload.sessionId === "string" && payload.sessionId
      ? payload.sessionId.slice(0, 64)
      : crypto.randomUUID();

  const history = loadSession(sessionId);
  history.push({ role: "user", content: message.trim() });
  const toolCalls: ToolCallRecord[] = [];

  try {
    let reply = "";
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const assistant = await callOpenAI([
        { role: "system", content: SYSTEM_PROMPT },
        ...trimmed(history),
      ]);
      if (!assistant) throw new Error("Empty response from the model.");
      history.push(assistant);
      if (!assistant.tool_calls?.length) {
        reply = assistant.content ?? "";
        break;
      }
      for (const call of assistant.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(call.function.arguments || "{}");
          if (parsed && typeof parsed === "object") args = parsed;
        } catch {
          args = {};
        }
        const record = runTool(call.function.name, args);
        toolCalls.push(record);
        history.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(record.result),
        });
      }
    }
    saveSession(sessionId, history);
    if (!reply)
      return Response.json(
        { error: "The assistant did not produce a final answer.", toolCalls },
        { status: 502 },
      );
    return Response.json({ reply, toolCalls, sessionId });
  } catch (err) {
    saveSession(sessionId, history);
    return Response.json(
      { error: err instanceof Error ? err.message : "Chat request failed." },
      { status: 502 },
    );
  }
}
