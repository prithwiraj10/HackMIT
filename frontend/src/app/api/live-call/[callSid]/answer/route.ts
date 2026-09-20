import { readJsonBounded } from "@/lib/bounded-body";

const serviceUrl = process.env.TELEPHONY_SERVICE_URL ?? "http://127.0.0.1:8080";

export async function POST(
  request: Request,
  context: { params: Promise<{ callSid: string }> },
) {
  const { callSid } = await context.params;
  const body = await readJsonBounded(request, 2 * 1024);
  try {
    const result = await fetch(serviceUrl + "/calls/" + encodeURIComponent(callSid) + "/answer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.TELEPHONY_ENDPOINT_SECRET
          ? { Authorization: "Bearer " + process.env.TELEPHONY_ENDPOINT_SECRET }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return Response.json(await result.json(), { status: result.status });
  } catch {
    return Response.json({ error: "Live-call bridge unavailable." }, { status: 503 });
  }
}
