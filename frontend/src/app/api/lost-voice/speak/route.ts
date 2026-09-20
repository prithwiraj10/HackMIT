import { BodyTooLarge, readJsonBounded } from "@/lib/bounded-body";

const MAX_BODY_BYTES = 16 * 1024;
const voices = new Set([
  "aura-2-andromeda-en",
  "aura-2-helena-en",
  "aura-2-arcas-en",
  "aura-2-aries-en",
]);

export async function POST(request: Request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key)
    return Response.json(
      { error: "Set DEEPGRAM_API_KEY in frontend/.env.local, then restart." },
      { status: 503 },
    );
  let body: { text?: unknown; voice?: unknown };
  try {
    const parsed = await readJsonBounded(request, MAX_BODY_BYTES);
    if (!parsed || typeof parsed !== "object")
      return Response.json({ error: "Expected speech text." }, { status: 400 });
    body = parsed;
  } catch (err) {
    if (err instanceof BodyTooLarge)
      return Response.json(
        { error: "Speech text is too large." },
        { status: 413 },
      );
    return Response.json({ error: "Expected speech text." }, { status: 400 });
  }
  const text =
    typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  const voice =
    typeof body.voice === "string" && voices.has(body.voice)
      ? body.voice
      : "aura-2-helena-en";
  if (!text)
    return Response.json({ error: "Add text to speak." }, { status: 400 });
  const res = await fetch("https://api.deepgram.com/v1/speak?model=" + voice, {
    method: "POST",
    headers: {
      Authorization: "Token " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return Response.json(
      { error: detail || "Deepgram could not synthesize this audio." },
      { status: res.status },
    );
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
