import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton — prevents exhausting connections during HMR
 * in development.
 *
 * Path matches AGENTS.md §6 (`lib/prisma.ts`).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
