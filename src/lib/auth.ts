import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/lib/utils/validators";

/**
 * Full NextAuth (Auth.js v5) configuration.
 *
 * Provider: Credentials (email + password) backed by Prisma. Sessions
 * use JWT strategy because Credentials provider doesn't support
 * database sessions in Auth.js v5.
 *
 * The Prisma adapter is intentionally NOT wired here yet — it's only
 * needed when adding OAuth providers (Google, etc.). Adding it now
 * would force the whole module into Node runtime, which we want to
 * keep flexible.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
});
