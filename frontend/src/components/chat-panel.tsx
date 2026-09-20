"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal, X } from "lucide-react";
import "./chat.css";

type ToolCallRecord = {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
};
type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; calls?: ToolCallRecord[] };

const SUGGESTIONS = [
  "Where are all the hotspots for infection?",
  "Where should I install hand sanitizer stations?",
  "When should I put out a mask mandate?",
  "How do I curb infection in Maseeh Hall?",
];

function preview(result: unknown) {
  const text = JSON.stringify(result);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const sessionId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setInput("");
    setPending(true);
    setMessages((m) => [...m, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, sessionId: sessionId.current }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              body?.error ??
              `The chat endpoint returned an error (${res.status}).`,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: body.reply, calls: body.toolCalls },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Could not reach the chat endpoint. Is the dev server running?",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className="chat-launcher"
        aria-label={open ? "Close the model assistant" : "Ask the model"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        <span>Ask the model</span>
      </button>
      {open && (
        <section className="chat-panel" aria-label="Simulation assistant">
          <header className="chat-header">
            <div>
              <strong>Ask the model</strong>
              <span>Answers grounded in live simulation runs</span>
            </div>
            <button
              aria-label="Close"
              className="chat-close"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </header>
          <div className="chat-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>
                  Ask about hotspots, interventions, or timing. Every answer is
                  computed from the model — not guessed.
                </p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="chat-message user">
                  {m.content}
                </p>
              ) : (
                <div key={i} className="chat-message assistant">
                  <p>{m.content}</p>
                  {!!m.calls?.length && (
                    <details className="chat-tools">
                      <summary>
                        Grounded by {m.calls.length} tool{" "}
                        {m.calls.length === 1 ? "call" : "calls"}
                      </summary>
                      {m.calls.map((c, j) => (
                        <div key={j} className="chat-tool">
                          <code>
                            {c.name}({JSON.stringify(c.arguments)})
                          </code>
                          <pre>{preview(c.result)}</pre>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              ),
            )}
            {pending && <p className="chat-typing">Running tools…</p>}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              aria-label="Ask a question about the simulation"
              placeholder="Ask about the simulation…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={pending}
            />
            <button
              className="chat-send"
              aria-label="Send message"
              disabled={pending || !input.trim()}
            >
              <SendHorizontal size={15} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
