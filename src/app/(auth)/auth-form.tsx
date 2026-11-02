"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup, type FormState } from "./actions";

export function AuthForm({
  mode,
  canClaim = false,
}: {
  mode: "login" | "signup";
  canClaim?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mode === "login" ? login : signup,
    undefined,
  );
  const [claim, setClaim] = useState(false);
  const isSignup = mode === "signup";
  return (
    <form action={action} className="auth-form" noValidate={false}>
      {isSignup && (
        <label>
          <span>Name</span>
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            defaultValue={state?.name}
          />
        </label>
      )}
      <label>
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
        />
      </label>
      <label>
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
        />
        {isSignup && <small>At least 8 characters.</small>}
      </label>
      {isSignup && canClaim && (
        <div className="claim">
          {claim ? (
            <label>
              <span>Original workspace password</span>
              <input name="legacyPassword" type="password" autoComplete="off" />
              <small>
                Attaches the existing Forma workspace to this new account. This
                works once.
              </small>
            </label>
          ) : (
            <button
              type="button"
              className="text-link"
              onClick={() => setClaim(true)}
            >
              Moving over the original workspace?
            </button>
          )}
        </div>
      )}
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="site-btn primary large full" disabled={pending}>
        {pending
          ? isSignup
            ? "Creating account…"
            : "Logging in…"
          : isSignup
            ? "Create account"
            : "Log in"}
      </button>
      <p className="auth-switch">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New to Forma? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
