export class BodyTooLarge extends Error {
  constructor(public readonly limit: number) {
    super(`Request body exceeds ${limit} bytes`);
  }
}

// Streams the request body and stops as soon as it passes `limit`, so a
// chunked upload without a content-length cannot be buffered in full.
export async function readBounded(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new BodyTooLarge(limit);
  if (!request.body) return new Uint8Array(new ArrayBuffer(0));
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new BodyTooLarge(limit);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// Parses a JSON body under `limit` bytes. Returns `null` when the body is
// malformed JSON; throws `BodyTooLarge` when it is oversized.
export async function readJsonBounded(
  request: Request,
  limit: number,
): Promise<unknown> {
  const raw = await readBounded(request, limit);
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
}
