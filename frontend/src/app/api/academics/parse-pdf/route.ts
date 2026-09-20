export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const uploaded = form.get("file");
    if (!uploaded || typeof uploaded === "string")
      return Response.json({ error: "Choose a PDF first." }, { status: 400 });
    const file = uploaded as File;
    const pdf = require("pdf-parse/lib/pdf-parse.js") as (input: Buffer) => Promise<{ text: string }>;
    const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
    return Response.json({ text: parsed.text.slice(0, 60000) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not parse this PDF. Paste the syllabus text instead." }, { status: 400 });
  }
}
