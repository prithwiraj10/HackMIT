const fallback =
  "Rest, fluids, and low-effort meals can be reasonable supportive steps. If symptoms are severe, worsening, or making it hard to breathe, stay awake, or keep fluids down, contact campus health or urgent care. This is general support, not a diagnosis or medication instruction.";

export async function POST(request: Request) {
  let body: {
    symptoms?: unknown;
    note?: unknown;
    severity?: unknown;
    energy?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected check-in data." }, { status: 400 });
  }
  const symptoms = Array.isArray(body.symptoms)
    ? body.symptoms.filter((x): x is string => typeof x === "string").join(", ")
    : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";
  const severity =
    typeof body.severity === "number" ? body.severity : "unknown";
  const energy = typeof body.energy === "number" ? body.energy : "unknown";
  if (!process.env.OPENAI_API_KEY)
    return Response.json({ guidance: fallback, source: "fallback" });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Give brief, general, non-diagnostic sick-day support for a college student. Do not name a diagnosis, recommend specific medication or dosing, or replace care. Mention reasonable self-care categories, when to contact campus health, and emergency red flags. Use 3 short bullets.",
          },
          {
            role: "user",
            content:
              "Symptoms: " +
              (symptoms || "none") +
              "\nSeverity (1-5): " +
              severity +
              "\nEnergy (1-5): " +
              energy +
              "\nStudent summary: " +
              (note || "none"),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = await res.json();
    const guidance = json?.choices?.[0]?.message?.content;
    if (!res.ok || typeof guidance !== "string") throw new Error();
    return Response.json({ guidance, source: "openai" });
  } catch {
    return Response.json({ guidance: fallback, source: "fallback" });
  }
}
