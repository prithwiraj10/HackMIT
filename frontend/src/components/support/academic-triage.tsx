"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";

type Assignment = { name: string; dueAt: string };
type Course = {
  id: number;
  course: string;
  professor: string;
  professorEmail: string;
  syllabus: string;
  assignments: Assignment[];
};
type Plan = {
  overview?: string;
  priorities?: {
    course: string;
    assignment: string;
    dueAt?: string;
    priority: string;
    latePolicy?: string;
    why: string;
  }[];
  missingPolicy?: {
    course: string;
    whatIsMissing: string;
    questionToAsk: string;
  }[];
  emails?: {
    course: string;
    professor: string;
    subject: string;
    body: string;
  }[];
};

export function AcademicTriage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [illness, setIllness] = useState(
    "I am sick and have limited energy today.",
  );
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);

  const update = (id: number, patch: Partial<Course>) =>
    setCourses((a) => a.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const importCanvas = async () => {
    setBusy(true);
    setStatus(
      "Importing active Canvas courses, instructors, syllabi, and upcoming assignments…",
    );
    try {
      const res = await fetch("/api/academics/canvas");
      const data: { courses?: Course[]; error?: string } = await res.json();
      if (!res.ok || !data.courses) throw new Error(data.error);
      setCourses(data.courses);
      setStatus(
        `Imported ${data.courses.length} Canvas courses. Add a PDF or pasted text wherever policy detail is missing.`,
      );
    } catch (e) {
      setStatus(
        e instanceof Error && e.message ? e.message : "Canvas import failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const parsePdf = async (course: Course, file: File) => {
    setBusy(true);
    setStatus("Parsing " + file.name + "…");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/academics/parse-pdf", {
        method: "POST",
        body: form,
      });
      const data: { text?: string; error?: string } = await res.json();
      if (!res.ok || typeof data.text !== "string") throw new Error(data.error);
      update(course.id, { syllabus: data.text });
      setStatus("Added syllabus text to " + (course.course || "course") + ".");
    } catch (e) {
      setStatus(
        e instanceof Error && e.message ? e.message : "Could not parse PDF.",
      );
    } finally {
      setBusy(false);
    }
  };

  const ready = courses.some(
    (c) => c.course.trim() && (c.syllabus.trim() || c.assignments.length),
  );

  const run = async () => {
    if (!ready) {
      setStatus(
        "Add a course with a name and a syllabus (or Canvas assignments) first.",
      );
      return;
    }
    setBusy(true);
    setStatus("Reading policies and building your completed email drafts…");
    try {
      const res = await fetch("/api/academics/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courses, illness, name: name || "Student" }),
      });
      const data: Plan & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data);
      setStatus("AI triage plan ready.");
    } catch (e) {
      setStatus(
        e instanceof Error && e.message
          ? e.message
          : "Could not build the plan.",
      );
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
              <h2>1. Bring in course context</h2>
              <p>
                Canvas provides course names, instructors, syllabus bodies and
                upcoming assignments. Add a PDF or pasted text to fill any
                policy gaps.
              </p>
            </div>
          </div>
          <div className="support-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={importCanvas}
            >
              Import from Canvas
            </button>
            <button
              className="button"
              onClick={() =>
                setCourses((a) => [
                  ...a,
                  {
                    id: Date.now(),
                    course: "New course",
                    professor: "",
                    professorEmail: "",
                    syllabus: "",
                    assignments: [],
                  },
                ])
              }
            >
              <Plus size={15} /> Add course manually
            </button>
          </div>
          <p className="status-message">{status}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>2. About you</h2>
              <p>Used to sign and personalise the drafted emails.</p>
            </div>
          </div>
          <label className="field-label" htmlFor="triage-name">
            Your name for completed emails
          </label>
          <input
            id="triage-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kira Garcia"
          />
          <label className="field-label" htmlFor="triage-illness">
            What should professors know?
          </label>
          <textarea
            id="triage-illness"
            className="text-input"
            rows={3}
            value={illness}
            onChange={(e) => setIllness(e.target.value)}
            placeholder="Describe the illness and availability generally."
          />
        </section>
      </div>

      {courses.map((c) => (
        <section className="panel" key={c.id}>
          <div className="panel-heading">
            <div>
              <h2>{c.course || "Course"}</h2>
              <p>
                {c.professor
                  ? c.professorEmail
                    ? c.professor + " · " + c.professorEmail
                    : c.professor
                  : "Instructor not found in Canvas"}
              </p>
            </div>
            <button
              className="button"
              onClick={() => setCourses((a) => a.filter((x) => x.id !== c.id))}
            >
              Remove
            </button>
          </div>
          <div className="support-grid">
            <div>
              <label className="field-label" htmlFor={`course-name-${c.id}`}>
                Course name
              </label>
              <input
                id={`course-name-${c.id}`}
                className="text-input"
                value={c.course}
                onChange={(e) => update(c.id, { course: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor={`course-prof-${c.id}`}>
                Professor name
              </label>
              <input
                id={`course-prof-${c.id}`}
                className="text-input"
                value={c.professor}
                onChange={(e) => update(c.id, { professor: e.target.value })}
                placeholder="Professor name"
              />
            </div>
          </div>
          <label className="field-label" htmlFor={`course-syllabus-${c.id}`}>
            Syllabus and policy text
          </label>
          <textarea
            id={`course-syllabus-${c.id}`}
            className="text-input"
            rows={6}
            maxLength={60000}
            value={c.syllabus}
            onChange={(e) => update(c.id, { syllabus: e.target.value })}
            placeholder="Paste attendance, makeup, and late-work policies here."
          />
          <div className="support-actions">
            <label className="button support-file">
              <Upload size={15} /> Parse syllabus PDF
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parsePdf(c, f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <p className="support-hint">
            {c.assignments.length
              ? c.assignments
                  .map(
                    (a) =>
                      a.name + " · due " + new Date(a.dueAt).toLocaleString(),
                  )
                  .join(" | ")
              : "No upcoming Canvas assignments found."}
          </p>
        </section>
      ))}

      <section className="panel support-run">
        <div>
          <h2>3. Build the plan</h2>
          <p>
            The assistant only uses the supplied Canvas data and syllabus text
            and never invents a policy or deadline.
          </p>
        </div>
        <button
          className="button primary"
          disabled={busy || !ready}
          onClick={run}
        >
          {busy ? "Building plan…" : "Build AI class triage"}
        </button>
      </section>

      {plan && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>What to do first</h2>
              <p>{plan.overview}</p>
            </div>
          </div>
          <h3 className="support-subhead">Upcoming assignments, ranked</h3>
          <ul className="support-list">
            {plan.priorities?.map((x, i) => (
              <li key={i}>
                <div>
                  <strong>
                    {x.priority} · {x.course}: {x.assignment}
                  </strong>
                  <small>
                    Due: {x.dueAt || "not supplied"} · {x.why}
                  </small>
                  <small>
                    <b>Late / sick policy:</b>{" "}
                    {x.latePolicy || "Not stated in supplied material."}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="support-subhead">Policy questions still missing</h3>
          <ul className="support-list">
            {plan.missingPolicy?.map((x, i) => (
              <li key={i}>
                <div>
                  <strong>{x.course}</strong>
                  <small>{x.whatIsMissing}</small>
                  <small>
                    <b>Ask:</b> {x.questionToAsk}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="support-subhead">Ready-to-send emails</h3>
          {plan.emails?.map((x, i) => (
            <article className="support-result support-email" key={i}>
              <b>
                To: {x.professor} · {x.course}
              </b>
              <p>
                <b>Subject:</b> {x.subject}
              </p>
              <pre>{x.body}</pre>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
