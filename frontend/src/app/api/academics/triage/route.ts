import { BodyTooLarge, readBounded } from "@/lib/bounded-body";

const MAX_COURSES = 12;
const MAX_ASSIGNMENTS = 100; // Canvas import fetches at most per_page=100
const MAX_SYLLABUS = 60_000; // matches what /api/academics/parse-pdf returns
const MAX_DESCRIPTION = 2_000;
const MAX_FIELD = 200;
const MAX_PAYLOAD = 400_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function boundCourse(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const assignments = Array.isArray(c.assignments) ? c.assignments : [];
  return {
    course: text(c.course, MAX_FIELD),
    professor: text(c.professor, MAX_FIELD),
    professorEmail: text(c.professorEmail, MAX_FIELD),
    syllabus: text(c.syllabus, MAX_SYLLABUS),
    assignments: assignments
      .slice(0, MAX_ASSIGNMENTS)
      .filter((a) => a && typeof a === "object")
      .map((a) => {
        const item = a as Record<string, unknown>;
        return {
          name: text(item.name, MAX_FIELD),
          dueAt: text(item.dueAt, MAX_FIELD),
          points: number(item.points),
          description: text(item.description, MAX_DESCRIPTION),
        };
      }),
  };
}

export async function POST(request: Request) {
  let body: { courses?: unknown; illness?: unknown; name?: unknown };
  try {
    const raw = await readBounded(request, MAX_BODY_BYTES);
    body = JSON.parse(new TextDecoder().decode(raw));
    if (!body || typeof body !== "object") throw new Error();
  } catch (error) {
    if (error instanceof BodyTooLarge)
      return Response.json(
        { error: "Course data is too large. Shorten the syllabus text." },
        { status: 413 },
      );
    return Response.json({ error: "Expected course data." }, { status: 400 });
  }
  if (!Array.isArray(body.courses) || !body.courses.length)
    return Response.json(
      { error: "Add at least one course." },
      { status: 400 },
    );
  if (body.courses.length > MAX_COURSES)
    return Response.json(
      { error: `Triage supports up to ${MAX_COURSES} courses at a time.` },
      { status: 413 },
    );
  const courses = body.courses.map(boundCourse).filter((c) => c !== null);
  if (!courses.length)
    return Response.json(
      { error: "Add at least one valid course." },
      { status: 400 },
    );
  if (!process.env.OPENAI_API_KEY)
    return Response.json(
      { error: "Set OPENAI_API_KEY to build an AI triage plan." },
      { status: 503 },
    );
  const illness =
    typeof body.illness === "string"
      ? body.illness.slice(0, 1200)
      : "The student is ill.";
  const name =
    typeof body.name === "string" ? body.name.slice(0, 120) : "Student";
  const userContent = JSON.stringify({ illness, name, courses });
  if (userContent.length > MAX_PAYLOAD)
    return Response.json(
      {
        error:
          "Course data is too large for one triage run. Shorten the pasted syllabus text or remove a course.",
      },
      { status: 413 },
    );
  const prompt =
    "You are an Academic Navigator for a sick college student. Use ONLY the provided Canvas data and syllabus text. Never invent a policy, professor, deadline, late penalty, or administrative process. Return valid JSON with: overview; priorities array, each {course,assignment,dueAt,priority,latePolicy,why}; missingPolicy array, each {course,whatIsMissing,questionToAsk}; emails array, each {course,professor,subject,body}; studentSupportEmail {subject,body}. Include every upcoming assignment. Rank strict/no-makeup/nearer due work higher. For each professor email, write a completed, ready-to-send email addressed to the provided professor name, describe the student's illness generally, and explicitly ask about attendance/makeup paths where the supplied policy is missing or mandatory attendance is stated. If no instructor name exists, use 'Professor' only. Also draft one completed email to S³ Student Support Services: state the illness generally, list every supplied course by name, and ask general questions about documentation, communicating with instructors, and any illness-related support or excused-absence process. Do not claim S³ will grant an excuse; ask whether it can help. Sign every email with the supplied student name.";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!res.ok || typeof text !== "string")
      throw new Error(json?.error?.message || "The AI triage request failed.");
    return Response.json(JSON.parse(text));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not build triage.",
      },
      { status: 502 },
    );
  }
}
