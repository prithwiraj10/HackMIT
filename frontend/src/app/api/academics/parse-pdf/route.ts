import { BodyTooLarge, readBounded } from "@/lib/bounded-body";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const PDF_SIGNATURE = "%PDF-";

function looksLikePdf(bytes: Uint8Array) {
  const head = new TextDecoder().decode(bytes.subarray(0, 1024));
  return head.includes(PDF_SIGNATURE);
}

export async function POST(request: Request) {
  let body: Uint8Array<ArrayBuffer>;
  try {
    // Multipart framing adds a little on top of the file itself.
    body = await readBounded(request, MAX_PDF_BYTES + 64 * 1024);
  } catch (error) {
    if (error instanceof BodyTooLarge)
      return Response.json(
        {
          error: "Syllabus PDFs are limited to 15 MB. Paste the text instead.",
        },
        { status: 413 },
      );
    throw error;
  }
  try {
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const uploaded = form.get("file");
    if (!uploaded || typeof uploaded === "string")
      return Response.json({ error: "Choose a PDF first." }, { status: 400 });
    const file = uploaded as File;
    if (file.size > MAX_PDF_BYTES)
      return Response.json(
        {
          error: "Syllabus PDFs are limited to 15 MB. Paste the text instead.",
        },
        { status: 413 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikePdf(bytes))
      return Response.json(
        { error: "Only PDF files can be parsed." },
        { status: 400 },
      );
    const pdf = require("pdf-parse/lib/pdf-parse.js") as (
      input: Buffer,
    ) => Promise<{ text: string }>;
    const parsed = await pdf(Buffer.from(bytes));
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
