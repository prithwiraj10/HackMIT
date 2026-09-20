export async function POST(request: Request) {
  let body: { courses?: unknown; illness?: unknown; name?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Expected course data." }, { status: 400 }); }
  if (!Array.isArray(body.courses)) return Response.json({ error: "Add at least one course." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Set OPENAI_API_KEY to build an AI triage plan." }, { status: 503 });
  const illness = typeof body.illness === "string" ? body.illness.slice(0, 1200) : "The student is ill.";
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : "Student";
  const prompt = "You are an Academic Navigator for a sick college student. Use ONLY the provided Canvas data and syllabus text. Never invent a policy, professor, deadline, or late penalty. Return valid JSON with: overview; priorities array, each {course,assignment,dueAt,priority,latePolicy,why}; missingPolicy array, each {course,whatIsMissing,questionToAsk}; emails array, each {course,professor,subject,body}. Include every upcoming assignment. Rank strict/no-makeup/nearer due work higher. For each email, write a completed, ready-to-send email addressed to the provided professor name, describe the student's illness generally, and explicitly ask about attendance/makeup paths where the supplied policy is missing or mandatory attendance is stated. If no instructor name exists, use 'Professor' only. Sign every email with the supplied student name.";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", temperature: 0.15, response_format: { type: "json_object" }, messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify({ illness, name, courses: body.courses }).slice(0, 60000) }] }),
      signal: AbortSignal.timeout(45_000),
    });
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!res.ok || typeof text !== "string") throw new Error(json?.error?.message || "The AI triage request failed.");
    return Response.json(JSON.parse(text));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not build triage." }, { status: 502 });
  }
}
