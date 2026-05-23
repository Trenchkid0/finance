"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/utils/validators";
import type { ActionResult } from "@/types";

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function getString(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export async function createCategory(
  _prev: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const parsed = createCategorySchema.safeParse({
    name: getString(formData, "name"),
    type: getString(formData, "type"),
    icon: getString(formData, "icon"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    // Check if category name already exists for this user (or defaults)
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        type: data.type,
        OR: [{ userId: null }, { userId }],
      },
    });

    if (existing) {
      return { ok: false, error: "Kategori dengan nama tersebut sudah ada." };
    }

    await prisma.category.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        icon: data.icon || "📂",
        isDefault: false,
      },
    });
  } catch {
    return { ok: false, error: "Gagal membuat kategori baru." };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const existing = await prisma.category.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { ok: false, error: "Kategori tidak ditemukan atau tidak dapat dihapus." };
  }

  try {
    await prisma.category.delete({
      where: { id },
    });
  } catch {
    return { ok: false, error: "Gagal menghapus kategori." };
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { ok: true };
}
