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
        if (!parsed.success) {
          // Validasi gagal — biasanya format email tidak valid atau
          // password kosong. Kita log warn supaya gampang debug saat
          // user lapor "tidak bisa login" — Auth.js v5 menelan detail
          // dan cuma melempar generic "CredentialsSignin".
          console.warn(
            "[auth] credentials validation failed:",
            parsed.error.flatten().fieldErrors,
          );
          return null;
        }

        const { email, password } = parsed.data;

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (err) {
          // Koneksi DB putus, schema belum sync, atau env DATABASE_URL
          // salah. Pesan konkret di log container — bukan di toast user.
          console.error("[auth] DB error saat lookup user:", err);
          return null;
        }

        if (!user) {
          console.warn(`[auth] user tidak ditemukan untuk email: ${email}`);
          return null;
        }

        if (!user.password) {
          // User dibuat lewat OAuth dan tidak pernah set password.
          console.warn(
            `[auth] user ${email} tidak punya password (OAuth-only?)`,
          );
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.warn(`[auth] password salah untuk email: ${email}`);
          return null;
        }

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
