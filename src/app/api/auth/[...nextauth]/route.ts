import { handlers } from "@/lib/auth";

/**
 * Auth.js HTTP handlers — used internally by `signIn`, `signOut`,
 * and OAuth callbacks. Don't call these endpoints directly from
 * your code; use the server-side `signIn` / `signOut` exports.
 */
export const { GET, POST } = handlers;
