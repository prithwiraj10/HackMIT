import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ff_admin";
const SESSION_HOURS = 8;
// Local development default. Set ADMIN_PASSWORD before deploying anywhere real.
const password = process.env.ADMIN_PASSWORD ?? "hackmit2026";

function token() {
  return createHmac("sha256", password).update("freshman-flu-admin").digest();
}

export function issueToken() {
  return token().toString("hex");
}

export function verifyPassword(candidate: string) {
  const given = Buffer.from(candidate);
  const expected = Buffer.from(password);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function isAdmin() {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  const expected = token();
  // Buffer.from(..., "hex") stops at the first invalid pair, so a token with
  // trailing junk would otherwise decode to the valid prefix.
  if (!value || !new RegExp(`^[0-9a-f]{${expected.length * 2}}$`).test(value))
    return false;
  return timingSafeEqual(Buffer.from(value, "hex"), expected);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
} as const;
