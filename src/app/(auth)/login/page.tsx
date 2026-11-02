import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
export const metadata: Metadata = { title: "Log in — Forma" };
export default function LoginPage() {
  return (
    <>
      <h1>Welcome back</h1>
      <p className="auth-sub">Log in to pick up where you left off.</p>
      <AuthForm mode="login" />
    </>
  );
}
