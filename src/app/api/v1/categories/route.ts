import type { NextRequest } from "next/server";
import { authenticateApi, okResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/categories
 * Mengembalikan kategori default sistem + kategori user.
 * Filter optional `?type=income|expense`.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: auth.userId }, { userId: null }],
      ...(type === "income" || type === "expense" ? { type } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true,
      isDefault: true,
    },
  });

  return okResponse(categories);
}
