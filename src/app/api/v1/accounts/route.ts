import type { NextRequest } from "next/server";
import { authenticateApi, okResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/accounts
 * Daftar akun keuangan milik user. Default hanya akun aktif; pakai
 * `?includeInactive=true` untuk semua.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";

  const accounts = await prisma.financeAccount.findMany({
    where: {
      userId: auth.userId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      currency: true,
      icon: true,
      color: true,
      isActive: true,
      createdAt: true,
    },
  });

  return okResponse(
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      currency: a.currency,
      icon: a.icon,
      color: a.color,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    })),
  );
}
