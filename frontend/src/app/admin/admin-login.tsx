"use client";

import { useActionState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { signIn } from "./actions";

export function AdminLogin() {
  const [error, formAction, pending] = useActionState(signIn, "");
  return (
    <form className="admin-login" action={formAction}>
      <span className="admin-lock">
        <Lock size={19} />
      </span>
      <h2>Administrator sign in</h2>
      <p>This area is restricted to campus administrators.</p>
      <label className="field-label" htmlFor="admin-password">
        Password
      </label>
      <input
        className="text-input"
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"} <ArrowRight size={15} />
      </button>
    </form>
  );
}
