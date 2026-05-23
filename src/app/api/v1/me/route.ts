import type { NextRequest } from "next/server";
import { authenticateApi, okResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/me
 * Mengembalikan info user yang memiliki API key yang dipakai.
 * Berguna untuk smoke test integrasi.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return okResponse({
    id: user?.id ?? auth.userId,
    name: user?.name ?? null,
    email: user?.email ?? null,
    createdAt: user?.createdAt.toISOString() ?? null,
  });
}
