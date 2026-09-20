"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import {
  SYMPTOMS,
  recognizeSpeech,
  today,
  type CheckIn,
} from "@/lib/support-data";

const MIN_NOTE = 12;
const OFFLINE_GUIDANCE =
  "Rest, hydration, and asking a friend for practical help may be useful. Contact campus health if you are worried.";

export function CheckIns({
  checkIns,
  onSave,
}: {
  checkIns: CheckIn[];
  onSave: (item: CheckIn) => void;
}) {
  const [symptoms, setSymptoms] = useState<string[]>(["Fatigue"]);
  const [energy, setEnergy] = useState(3);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState("");
  const [dictation, setDictation] = useState("");
  const [guidance, setGuidance] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  const dates = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 27 + i);
    return d.toLocaleDateString("en-CA");
  });
  const forDay = (d: string) => checkIns.filter((x) => x.date === d);
  const ready = note.trim().length >= MIN_NOTE;

  const toggle = (x: string) =>
    setSymptoms((a) => (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]));

  const dictate = () => {
    const started = recognizeSpeech(
      (text) => {
        setNote(text);
        setDictation("Added your spoken summary.");
      },
      () => setDictation("I could not hear that. Please try again or type it."),
    );
    setDictation(
      started
        ? "Listening… describe your symptoms and how they affect you."
        : "Voice transcription is not supported here. Please type your summary.",
    );
  };

  const save = async () => {
    if (!ready) return;
    const item: CheckIn = {
      id: Date.now(),
      date: today(),
      symptoms,
      energy,
      severity,
      note,
    };
    onSave(item);
    setNote("");
    setBusy(true);
    try {
      const res = await fetch("/api/student-guidance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item),
      });
      const data: { guidance?: string; source?: string } = await res.json();
      setGuidance(data.guidance || "General support is unavailable right now.");
      setSource(data.source || "fallback");
    } catch {
      setGuidance(OFFLINE_GUIDANCE);
      setSource("fallback");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="support-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>New check-in</h2>
              <p>Multiple check-ins per day are supported.</p>
            </div>
          </div>
          <span className="field-label">Symptoms</span>
          <div className="support-chips" role="group" aria-label="Symptoms">
            {SYMPTOMS.map((x) => (
              <button
                key={x}
                type="button"
                className={symptoms.includes(x) ? "selected" : ""}
                aria-pressed={symptoms.includes(x)}
                onClick={() => toggle(x)}
              >
                {x}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="checkin-energy">
            Energy: {energy}/5
          </label>
          <input
            id="checkin-energy"
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(+e.target.value)}
          />
          <label className="field-label" htmlFor="checkin-severity">
            How severe does it feel? {severity}/5
          </label>
          <input
            id="checkin-severity"
            type="range"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(+e.target.value)}
          />
          <label className="field-label" htmlFor="checkin-note">
            Symptom summary (required)
          </label>
          <textarea
            id="checkin-note"
            className="text-input"
            rows={5}
            placeholder="Describe what you feel, when it started, how intense it is, and how it affects eating, sleep, class, or breathing."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="support-actions">
            <button className="button" onClick={dictate}>
              <Mic size={15} /> Dictate summary
            </button>
            <button className="button primary" disabled={!ready} onClick={save}>
              {ready
                ? "Save check-in + get AI support"
                : "Add a detailed summary to continue"}
            </button>
          </div>
          <p className="status-message">{dictation}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Last 28 days</h2>
              <p>Select a logged day to review it.</p>
            </div>
          </div>
          <div className="support-calendar">
            {dates.map((d) => {
              const logs = forDay(d);
              return (
                <button
                  key={d}
                  className={logs.length ? "logged" : ""}
                  disabled={!logs.length}
                  aria-pressed={picked === d}
                  aria-label={
                    d + (logs.length ? `, ${logs.length} logged` : "")
                  }
                  onClick={() => setPicked(d)}
                >
                  <b>{d.slice(-2)}</b>
                  {logs.length > 0 && (
                    <small>
                      {logs.length} log{logs.length > 1 ? "s" : ""}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <span className="eyebrow support-log-title">
            {picked ? "LOGS FOR " + picked : "SELECT A TRACKED DAY"}
          </span>
          {picked ? (
            <ul className="support-list">
              {forDay(picked).map((x) => (
                <li key={x.id}>
                  <div>
                    <strong>{x.symptoms.join(", ")}</strong>
                    <small>
                      Severity {x.severity}/5 · Energy {x.energy}/5 ·{" "}
                      {x.note || "No note"}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="support-empty">
              Days with a check-in are highlighted in green.
            </p>
          )}
        </section>
      </div>

      {(busy || guidance) && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Next-step support</h2>
              <p>
                {busy
                  ? "Asking the support assistant…"
                  : source === "openai"
                    ? "AI-generated from your check-in"
                    : "General fallback guidance (AI unavailable)"}
              </p>
            </div>
          </div>
          {!busy && (
            <>
              <div className="support-result support-guidance">
                {guidance.replace(/\*\*/g, "")}
              </div>
              <p className="support-disclaimer">
                This is not a diagnosis or medication instruction. If symptoms
                are severe, worsening, or urgent, contact campus health or
                emergency services.
              </p>
            </>
          )}
        </section>
      )}
    </>
  );
}
