export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const agentId = process.env.DEEPGRAM_AGENT_ID;
  if (!apiKey || !agentId)
    return Response.json(
      {
        error:
          "Set DEEPGRAM_API_KEY and DEEPGRAM_AGENT_ID in frontend/.env.local, then restart the server.",
      },
      { status: 503 },
    );

  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: { Authorization: "Token " + apiKey },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as {
    access_token?: string;
    err_msg?: string;
  } | null;
  if (!res.ok || !body?.access_token)
    return Response.json(
      { error: body?.err_msg ?? "Deepgram could not mint a temporary token." },
      { status: 502 },
    );

  return Response.json({ token: body.access_token, agentId });
}
