import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Auth gate for the entire app.
 *
 * The `authorized` callback in `auth.config.ts` decides per-request
 * whether to redirect (to /login) or pass through. This middleware
 * runs in the Edge runtime — `auth.config.ts` is deliberately
 * Prisma-free for that reason.
 */
export default NextAuth(authConfig).auth;

export const config = {
  // Match everything except API routes and Next internals.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
