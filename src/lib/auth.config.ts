import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config — used by middleware.
 *
 * Why split: middleware runs in the Edge runtime where Prisma can't
 * execute. This file deliberately avoids importing Prisma, bcrypt, or
 * any Node-only module. The full config (with Credentials provider that
 * touches the DB) lives in `auth.ts` and is used by the API route +
 * Server Components only.
 *
 * The `authorized` callback is what middleware uses to decide whether
 * to allow a request through or redirect to `pages.signIn`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const isAuthPage = path.startsWith("/login") || path.startsWith("/register");

      if (isAuthPage) {
        // Already signed in → bounce to dashboard.
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Every other page requires a session.
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      // Persist the user id on the JWT at sign-in time.
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
