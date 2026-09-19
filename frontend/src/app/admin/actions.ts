"use server";

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  cookieOptions,
  issueToken,
  verifyPassword,
} from "@/lib/admin-auth";

export async function signIn(_state: string, formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !verifyPassword(password))
    return "That password is not correct.";
  (await cookies()).set(ADMIN_COOKIE, issueToken(), cookieOptions);
  return "";
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
}
