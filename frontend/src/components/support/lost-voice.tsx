"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import { DEEPGRAM_VOICES, recognizeSpeech } from "@/lib/support-data";

export function LostVoice() {
  return (
    <div className="support-columns">
      <WhisperToLoud />
      <CallProxy />
    </div>
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
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const releaseMic = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => releaseMic, []);

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
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const r = new MediaRecorder(stream.current);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        releaseMic();
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
      releaseMic();
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
