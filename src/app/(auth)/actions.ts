"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, createAccount, endSession } from "@/lib/auth";

export type FormState =
  { error?: string; email?: string; name?: string } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(200),
  legacyPassword: z.string().max(500).optional(),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: form.get("name"),
    email: String(form.get("email") ?? "").trim(),
    password: form.get("password"),
    legacyPassword: (form.get("legacyPassword") as string) || undefined,
  });
  const keep = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
  };
  if (!parsed.success)
    return { ...keep, error: parsed.error.issues[0].message };
  try {
    await createAccount(parsed.data);
  } catch (error) {
    return {
      ...keep,
      error:
        error instanceof Error
          ? error.message
          : "Could not create your account.",
    };
  }
  redirect("/app");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password)
    return { email, error: "Enter your email and password." };
  try {
    await authenticate(email, password);
  } catch (error) {
    return {
      email,
      error: error instanceof Error ? error.message : "Could not sign in.",
    };
  }
  redirect("/app");
}

export async function logout() {
  await endSession();
  redirect("/");
}
