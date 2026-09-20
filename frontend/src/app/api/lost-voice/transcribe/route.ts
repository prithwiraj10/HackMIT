const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key)
    return Response.json(
      { error: "Set DEEPGRAM_API_KEY in frontend/.env.local, then restart." },
      { status: 503 },
    );
  const tooLarge = Response.json(
    { error: "Voice clips are limited to 10 MB. Record a shorter clip." },
    { status: 413 },
  );
  if (Number(request.headers.get("content-length")) > MAX_AUDIO_BYTES)
    return tooLarge;
  const audio = await request.arrayBuffer();
  if (audio.byteLength > MAX_AUDIO_BYTES) return tooLarge;
  if (!audio.byteLength)
    return Response.json(
      { error: "Record a short voice clip first." },
      { status: 400 },
    );
  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en",
    {
      method: "POST",
      headers: {
        Authorization: "Token " + key,
        "Content-Type": request.headers.get("content-type") || "audio/webm",
      },
      body: audio,
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok)
    return Response.json(
      {
        error:
          body?.err_msg ||
          body?.message ||
          "Deepgram could not transcribe this clip.",
      },
      { status: res.status },
    );
  return Response.json({
    transcript:
      body?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "",
  });
}
