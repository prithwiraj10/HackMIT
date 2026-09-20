export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a PDF first." }, { status: 400 });
    const pdf = require("pdf-parse") as (input: Buffer) => Promise<{ text: string }>;
    const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
    return Response.json({ text: parsed.text.slice(0, 60000) });
  } catch {
    return Response.json({ error: "Could not parse this PDF. Paste the syllabus text instead." }, { status: 400 });
  }
}
