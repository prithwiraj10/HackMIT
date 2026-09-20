import { BodyTooLarge, readJsonBounded } from "@/lib/bounded-body";

const MAX_BODY_BYTES = 8 * 1024;
const serviceUrl = process.env.TELEPHONY_SERVICE_URL ?? "http://127.0.0.1:8080";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJsonBounded(request, MAX_BODY_BYTES);
  } catch (error) {
    return Response.json(
      { error: error instanceof BodyTooLarge ? "Call details are too large." : "Invalid call details." },
      { status: error instanceof BodyTooLarge ? 413 : 400 },
    );
  }
  if (!body || typeof body !== "object")
    return Response.json({ error: "Call details are required." }, { status: 400 });
  try {
    const result = await fetch(serviceUrl + "/make-call", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.TELEPHONY_ENDPOINT_SECRET
          ? { Authorization: "Bearer " + process.env.TELEPHONY_ENDPOINT_SECRET }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    return Response.json(await result.json(), { status: result.status });
  } catch {
    return Response.json(
      { error: "The live-call bridge is not running yet. Start it on port 8080." },
      { status: 503 },
    );
  }
}
