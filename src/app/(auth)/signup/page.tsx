import type { Metadata } from "next";
import { legacyWorkspaceClaimable } from "@/lib/auth";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Sign up — Forma" };
export default async function SignupPage() {
  return (
    <>
      <h1>Create your workspace</h1>
      <p className="auth-sub">A private place for the work that matters.</p>
      <AuthForm mode="signup" canClaim={await legacyWorkspaceClaimable()} />
    </>
  );
}
