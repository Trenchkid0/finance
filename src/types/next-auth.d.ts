import type { DefaultSession } from "next-auth";

/**
 * Augment NextAuth types so `session.user.id` is non-optional in app code.
 * Mirrors the JWT callback in `auth.config.ts`.
 */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}
