"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, SendHorizontal, Sparkles, X } from "lucide-react";
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
  "Which buildings have the highest modeled exposure?",
  "What changes most between day 7 and day 14?",
  "Explain how this simulation estimates exposure.",
];

function preview(result: unknown) {
  const value = JSON.stringify(result);
  return value.length > 400 ? `${value.slice(0, 400)}…` : value;
}

function renderInline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
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
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, sessionId: sessionId.current }),
      });
      const body = await response.json().catch(() => null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.ok
            ? body.reply
            : (body?.error ?? "Fluency could not complete that request."),
          calls: response.ok ? body.toolCalls : undefined,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Fluency cannot reach the model service right now.",
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
        type="button"
        aria-label={open ? "Close Fluency" : "Ask Fluency"}
        aria-expanded={open}
        onClick={() => setOpen((visible) => !visible)}
      >
        {open ? <X size={17} /> : <MessageCircle size={17} />}
        <span>{open ? "Close" : "Ask Fluency"}</span>
      </button>
      {open && (
        <section
          className="chat-panel"
          aria-label="Fluency simulation assistant"
        >
          <header className="chat-header">
            <span className="chat-identity">
              <i>
                <Sparkles size={15} />
              </i>
              <span>
                <strong>Fluency</strong>
                <small>Flu U simulation guide</small>
              </span>
            </span>
            <button
              type="button"
              aria-label="Close Fluency"
              className="chat-close"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </header>
          <div className="chat-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <span className="eyebrow">ASK ABOUT THIS RUN</span>
                <p>
                  Explore hotspots, timing, and model assumptions without
                  leaving the campus view.
                </p>
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) =>
              message.role === "user" ? (
                <p key={index} className="chat-message user">
                  {message.content}
                </p>
              ) : (
                <div key={index} className="chat-message assistant">
                  <p>{renderInline(message.content)}</p>
                  {!!message.calls?.length && (
                    <details className="chat-tools">
                      <summary>
                        Grounded by {message.calls.length} model tool
                        {message.calls.length === 1 ? "" : "s"}
                      </summary>
                      {message.calls.map((call, callIndex) => (
                        <div key={callIndex} className="chat-tool">
                          <code>
                            {call.name}({JSON.stringify(call.arguments)})
                          </code>
                          <pre>{preview(call.result)}</pre>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              ),
            )}
            {pending && <p className="chat-typing">Reading the simulation…</p>}
          </div>
          <form
            className="chat-input"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              aria-label="Ask Fluency a question"
              placeholder="Ask about the simulation…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
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
