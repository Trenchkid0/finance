"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

/**
 * Quick action: ubah hanya kategori transaksi tanpa mutasi saldo.
 *
 * Dipisah dari `updateTransaction` umum karena ini path "klik badge →
 * pilih kategori" yang ringan. Tidak perlu form full, validasi
 * minimal, dan TIDAK menyentuh balance reconciliation. Categori
 * change tidak mengubah amount → saldo akun tidak ikut bergeser.
 */
export async function updateTransactionCategory(
  id: string,
  categoryId: string | null,
): Promise<ActionResult<null>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true, type: true },
  });
  if (!tx) {
    return { ok: false, error: "Transaksi tidak ditemukan." };
  }
  if (tx.type === "transfer") {
    return {
      ok: false,
      error: "Transfer tidak punya kategori.",
    };
  }

  // Verifikasi kategori — boleh null (kosongkan), atau harus milik
  // user / sistem default dengan tipe yang cocok.
  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId }, { userId: null }],
      },
      select: { type: true },
    });
    if (!cat) {
      return { ok: false, error: "Kategori tidak valid." };
    }
    if (cat.type !== tx.type) {
      return {
        ok: false,
        error: "Kategori tidak cocok dengan tipe transaksi.",
      };
    }
  }

  try {
    await prisma.transaction.update({
      where: { id },
      data: { categoryId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return { ok: false, error: "Transaksi tidak ditemukan." };
    }
    return { ok: false, error: "Gagal mengubah kategori." };
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  return { ok: true };
}
