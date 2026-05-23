"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

/**
 * Set (upsert) a monthly budget limit for a category.
 *
 * Limit semantics:
 *  - `0` removes the budget row (no limit set).
 *  - Any positive value upserts. Negative values are rejected.
 */
export async function setBudgetLimit(
  categoryId: string,
  limit: number,
): Promise<ActionResult<null>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  if (!Number.isFinite(limit) || limit < 0) {
    return { ok: false, error: "Batas anggaran tidak valid." };
  }

  // Verify category exists and is accessible to this user (default or owned).
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type: "expense",
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, error: "Kategori tidak ditemukan." };
  }

  try {
    if (limit === 0) {
      // Idempotent: if no row exists, deleteMany simply does nothing.
      await prisma.budget.deleteMany({ where: { userId, categoryId } });
    } else {
      await prisma.budget.upsert({
        where: {
          userId_categoryId: { userId, categoryId },
        },
        create: {
          userId,
          categoryId,
          limit,
        },
        update: { limit },
      });
    }
  } catch {
    return { ok: false, error: "Gagal menyimpan batas anggaran." };
  }

  revalidatePath("/budget");
  return { ok: true };
}
