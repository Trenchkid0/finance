"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/utils/validators";
import type { ActionResult } from "@/types";

/**
 * Sign in with email + password. Returns an `ActionResult` to the form
 * instead of throwing, so the UI can render inline errors without
 * relying on framework-specific error boundaries.
 */
export async function login(
  _prevState: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/",
    });
    // signIn redirects on success; this line is unreachable.
    return { ok: true };
  } catch (error) {
    // Next.js redirect throws — let it propagate.
    if (isRedirectError(error)) throw error;

    if (error instanceof AuthError) {
      return {
        ok: false,
        error:
          error.type === "CredentialsSignin"
            ? "Email atau kata sandi salah."
            : "Gagal masuk. Coba lagi sebentar.",
      };
    }
    return { ok: false, error: "Terjadi kesalahan tak terduga." };
  }
}

/**
 * Register a new user, hash the password with bcrypt, then sign in.
 */
export async function register(
  _prevState: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      fieldErrors: { email: ["Email sudah terdaftar"] },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: passwordHash },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      ok: false,
      error: "Akun dibuat, tapi auto sign-in gagal. Silakan masuk manual.",
    };
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

/** Next.js' redirect() throws an internal error to abort the render — preserve it. */
function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
