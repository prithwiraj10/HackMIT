export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const tooLarge = Response.json(
    { error: "Syllabus PDFs are limited to 15 MB. Paste the text instead." },
    { status: 413 },
  );
  if (Number(request.headers.get("content-length")) > MAX_PDF_BYTES)
    return tooLarge;
  try {
    const form = await request.formData();
    const uploaded = form.get("file");
    if (!uploaded || typeof uploaded === "string")
      return Response.json({ error: "Choose a PDF first." }, { status: 400 });
    const file = uploaded as File;
    if (file.size > MAX_PDF_BYTES) return tooLarge;
    if (file.type && file.type !== "application/pdf")
      return Response.json(
        { error: "Only PDF files can be parsed." },
        { status: 400 },
      );
    const pdf = require("pdf-parse/lib/pdf-parse.js") as (
      input: Buffer,
    ) => Promise<{ text: string }>;
    const parsed = await pdf(Buffer.from(await file.arrayBuffer()));
    return Response.json({ text: parsed.text.slice(0, 60000) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not parse this PDF. Paste the syllabus text instead.",
      },
      { status: 400 },
    );
  }
}
