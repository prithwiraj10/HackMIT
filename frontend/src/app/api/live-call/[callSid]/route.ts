const serviceUrl = process.env.TELEPHONY_SERVICE_URL ?? "http://127.0.0.1:8080";

export async function GET(
  _request: Request,
  context: { params: Promise<{ callSid: string }> },
) {
  const { callSid } = await context.params;
  try {
    const result = await fetch(serviceUrl + "/calls/" + encodeURIComponent(callSid), {
      headers: process.env.TELEPHONY_ENDPOINT_SECRET
        ? { Authorization: "Bearer " + process.env.TELEPHONY_ENDPOINT_SECRET }
        : {},
      cache: "no-store",
    });
    return Response.json(await result.json(), { status: result.status });
  } catch {
    return Response.json({ error: "Live-call bridge unavailable." }, { status: 503 });
  }
}
