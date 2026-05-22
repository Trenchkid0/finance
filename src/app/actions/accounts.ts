"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/utils/validators";
import type { ActionResult } from "@/types";

const MUTATION_PATHS = ["/accounts", "/", "/transactions"] as const;

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

function revalidate() {
  for (const path of MUTATION_PATHS) {
    revalidatePath(path);
  }
}

export async function createAccount(
  _prev: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const parsed = createAccountSchema.safeParse({
    name: getString(formData, "name"),
    type: getString(formData, "type"),
    balance: getString(formData, "balance"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  try {
    await prisma.financeAccount.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        balance: new Prisma.Decimal(data.balance),
        color: data.color || "#388BFD",
        icon: data.icon || "Wallet",
        isActive: true,
      },
    });
  } catch (_err) {
    return { ok: false, error: "Gagal membuat akun baru." };
  }

  revalidate();
  return { ok: true };
}

export async function updateAccount(
  id: string,
  _prev: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const parsed = updateAccountSchema.safeParse({
    name: getString(formData, "name"),
    type: getString(formData, "type"),
    balance: getString(formData, "balance"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const existing = await prisma.financeAccount.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { ok: false, error: "Akun tidak ditemukan." };
  }

  try {
    await prisma.financeAccount.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        balance: new Prisma.Decimal(data.balance),
        color: data.color || "#388BFD",
        icon: data.icon || "Wallet",
      },
    });
  } catch (_err) {
    return { ok: false, error: "Gagal menyimpan perubahan akun." };
  }

  revalidate();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const existing = await prisma.financeAccount.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { ok: false, error: "Akun tidak ditemukan." };
  }

  try {
    // Perform soft-delete to retain transactions association
    await prisma.financeAccount.update({
      where: { id },
      data: { isActive: false },
    });
  } catch (_err) {
    return { ok: false, error: "Gagal menghapus akun." };
  }

  revalidate();
  return { ok: true };
}
