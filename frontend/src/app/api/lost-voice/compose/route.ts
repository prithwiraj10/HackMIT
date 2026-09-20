import { BodyTooLarge, readJsonBounded } from "@/lib/bounded-body";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  let body: { context?: unknown; caller?: unknown };
  try {
    const parsed = await readJsonBounded(request, MAX_BODY_BYTES);
    if (!parsed || typeof parsed !== "object")
      return Response.json(
        { error: "Expected call context." },
        { status: 400 },
      );
    body = parsed;
  } catch (err) {
    if (err instanceof BodyTooLarge)
      return Response.json(
        { error: "Call context is too large." },
        { status: 413 },
      );
    return Response.json({ error: "Expected call context." }, { status: 400 });
  }
  const context =
    typeof body.context === "string" ? body.context.slice(0, 2000) : "";
  const caller =
    typeof body.caller === "string" ? body.caller.slice(0, 1200) : "";
  const fallback =
    "Hello, this is {your name}. I’m calling about " +
    (context || "a health-related question") +
    ". Could you please tell me the next available step?";
  if (!process.env.OPENAI_API_KEY)
    return Response.json({ say: fallback, source: "fallback" });
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.25,
        messages: [
          {
            role: "system",
            content:
              "You draft one short, polite, speakable reply for a college student with a weak voice during a call. Keep useful placeholders such as {your name} editable. Do not diagnose, give medication advice, or claim clinical authority.",
          },
          {
            role: "user",
            content:
              "Call overview: " + context + "\nCaller just said: " + caller,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = await res.json();
    const say = json?.choices?.[0]?.message?.content;
    if (!res.ok || typeof say !== "string") throw new Error();
    return Response.json({ say, source: "openai" });
  } catch {
    return Response.json({ say: fallback, source: "fallback" });
  }
}
