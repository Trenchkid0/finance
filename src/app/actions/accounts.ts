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

/**
 * Account Server Actions.
 *
 * Design notes:
 *  - Balance is NOT editable directly. It moves only via transactions
 *    so the log stays the source of truth.
 *  - Hard delete is rejected when the account has any transactions
 *    (history would be silently destroyed). Users with non-empty
 *    accounts must either delete the transactions first or toggle the
 *    account inactive (`isActive=false`) — that hides it from the
 *    dashboard's net-worth and the transaction account picker without
 *    erasing data.
 */

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
  for (const path of MUTATION_PATHS) revalidatePath(path);
}

// --- Create --------------------------------------------------------------

export async function createAccount(
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const parsed = createAccountSchema.safeParse({
    name: getString(formData, "name"),
    type: getString(formData, "type"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
    startingBalance: getString(formData, "startingBalance") ?? "0",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, type, color, icon, startingBalance } = parsed.data;

  await prisma.financeAccount.create({
    data: {
      userId,
      name,
      type,
      color: color ?? null,
      icon: icon ?? null,
      balance: new Prisma.Decimal(startingBalance),
    },
  });

  revalidate();
  return { ok: true };
}

// --- Update --------------------------------------------------------------

export async function updateAccount(
  id: string,
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const parsed = updateAccountSchema.safeParse({
    name: getString(formData, "name"),
    type: getString(formData, "type"),
    color: getString(formData, "color"),
    icon: getString(formData, "icon"),
    // Checkbox sends "on" when checked, nothing when unchecked.
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.financeAccount.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Akun tidak ditemukan." };

  await prisma.financeAccount.update({
    where: { id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color ?? null,
      icon: parsed.data.icon ?? null,
      isActive: parsed.data.isActive ?? true,
    },
  });

  revalidate();
  return { ok: true };
}

// --- Toggle active -------------------------------------------------------

export async function toggleAccountActive(
  id: string,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const existing = await prisma.financeAccount.findFirst({
    where: { id, userId },
    select: { id: true, isActive: true },
  });
  if (!existing) return { ok: false, error: "Akun tidak ditemukan." };

  await prisma.financeAccount.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidate();
  return { ok: true };
}

// --- Delete --------------------------------------------------------------

/**
 * Hard delete. Refuses if the account has transactions or is the
 * destination of any transfer — in those cases the user should
 * deactivate or migrate the data first.
 */
export async function deleteAccount(id: string): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const existing = await prisma.financeAccount.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Akun tidak ditemukan." };

  const [txCount, transferInCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id } }),
    prisma.transaction.count({ where: { transferToId: id } }),
  ]);

  if (txCount > 0 || transferInCount > 0) {
    return {
      ok: false,
      error:
        "Akun memiliki riwayat transaksi. Nonaktifkan akun atau hapus transaksinya terlebih dahulu.",
    };
  }

  await prisma.financeAccount.delete({ where: { id } });

  revalidate();
  return { ok: true };
}
