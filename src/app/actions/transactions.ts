"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/utils/validators";
import type { ActionResult } from "@/types";

/**
 * Transaction Server Actions — full CRUD with atomic balance updates.
 *
 * Why $transaction: every mutation must adjust FinanceAccount.balance
 * to stay consistent with the transaction log. Update is the trickiest
 * — it has to revert the OLD row's effect before applying the new one,
 * and both effects may touch two accounts (transfers).
 *
 * AGENTS.md §5.2 — mutations live in Server Actions, not /api/.
 */

const MUTATION_PATHS = ["/transactions", "/", "/accounts"] as const;

// --- Helpers -------------------------------------------------------------

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Strip empty strings from FormData so optional schema fields parse correctly. */
function getString(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Signed deltas a transaction applies to its accounts.
 *  income on A      → A: +amount
 *  expense on A     → A: -amount
 *  transfer A → B   → A: -amount, B: +amount
 */
type Delta = { source: number; destination: number };

function balanceDelta(
  type: "income" | "expense" | "transfer",
  amount: number,
): Delta {
  switch (type) {
    case "income":
      return { source: amount, destination: 0 };
    case "expense":
      return { source: -amount, destination: 0 };
    case "transfer":
      return { source: -amount, destination: amount };
  }
}

async function applyDelta(
  tx: Prisma.TransactionClient,
  accountId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  await tx.financeAccount.update({
    where: { id: accountId },
    data: { balance: { increment: delta } },
  });
}

function revalidate() {
  for (const path of MUTATION_PATHS) revalidatePath(path);
}

// --- Create --------------------------------------------------------------

export async function createTransaction(
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const parsed = createTransactionSchema.safeParse({
    type: getString(formData, "type"),
    accountId: getString(formData, "accountId"),
    amount: getString(formData, "amount"),
    date: getString(formData, "date"),
    description: getString(formData, "description"),
    note: getString(formData, "note"),
    categoryId: getString(formData, "categoryId"),
    transferToId: getString(formData, "transferToId"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify ownership BEFORE opening the DB transaction so we don't roll back
  // a no-op write on the rare path where someone passes another user's id.
  const ownership = await verifyOwnership(userId, data);
  if (!ownership.ok) return ownership;

  const delta = balanceDelta(data.type, data.amount);

  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        userId,
        type: data.type,
        accountId: data.accountId,
        categoryId: data.type === "transfer" ? null : data.categoryId ?? null,
        transferToId: data.type === "transfer" ? data.transferToId ?? null : null,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
        note: data.note ?? null,
        date: data.date,
      },
    });

    await applyDelta(tx, data.accountId, delta.source);
    if (data.type === "transfer" && data.transferToId) {
      await applyDelta(tx, data.transferToId, delta.destination);
    }
  });

  revalidate();
  return { ok: true };
}

// --- Update --------------------------------------------------------------

export async function updateTransaction(
  id: string,
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const parsed = updateTransactionSchema.safeParse({
    type: getString(formData, "type"),
    accountId: getString(formData, "accountId"),
    amount: getString(formData, "amount"),
    date: getString(formData, "date"),
    description: getString(formData, "description"),
    note: getString(formData, "note"),
    categoryId: getString(formData, "categoryId"),
    transferToId: getString(formData, "transferToId"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return { ok: false, error: "Transaksi tidak ditemukan." };
  }

  const ownership = await verifyOwnership(userId, data);
  if (!ownership.ok) return ownership;

  // Revert old, apply new — atomically, so a failure mid-way can't leave
  // balances drifted from the transaction log.
  const oldDelta = balanceDelta(
    existing.type as "income" | "expense" | "transfer",
    Number(existing.amount),
  );
  const newDelta = balanceDelta(data.type, data.amount);

  await prisma.$transaction(async (tx) => {
    // 1. Revert old balance impact.
    await applyDelta(tx, existing.accountId, -oldDelta.source);
    if (existing.type === "transfer" && existing.transferToId) {
      await applyDelta(tx, existing.transferToId, -oldDelta.destination);
    }

    // 2. Update the row itself.
    await tx.transaction.update({
      where: { id },
      data: {
        type: data.type,
        accountId: data.accountId,
        categoryId: data.type === "transfer" ? null : data.categoryId ?? null,
        transferToId: data.type === "transfer" ? data.transferToId ?? null : null,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
        note: data.note ?? null,
        date: data.date,
      },
    });

    // 3. Apply new balance impact.
    await applyDelta(tx, data.accountId, newDelta.source);
    if (data.type === "transfer" && data.transferToId) {
      await applyDelta(tx, data.transferToId, newDelta.destination);
    }
  });

  revalidate();
  return { ok: true };
}

// --- Delete --------------------------------------------------------------

export async function deleteTransaction(id: string): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };

  const oldDelta = balanceDelta(
    existing.type as "income" | "expense" | "transfer",
    Number(existing.amount),
  );

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } });
    await applyDelta(tx, existing.accountId, -oldDelta.source);
    if (existing.type === "transfer" && existing.transferToId) {
      await applyDelta(tx, existing.transferToId, -oldDelta.destination);
    }
  });

  revalidate();
  return { ok: true };
}

// --- Ownership checks ----------------------------------------------------

type ParsedTransactionInput = {
  type: "income" | "expense" | "transfer";
  accountId: string;
  categoryId?: string;
  transferToId?: string;
};

async function verifyOwnership(
  userId: string,
  data: ParsedTransactionInput,
): Promise<ActionResult<null>> {
  const account = await prisma.financeAccount.findFirst({
    where: { id: data.accountId, userId },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, fieldErrors: { accountId: ["Akun tidak ditemukan"] } };
  }

  if (data.type === "transfer" && data.transferToId) {
    const dest = await prisma.financeAccount.findFirst({
      where: { id: data.transferToId, userId },
      select: { id: true },
    });
    if (!dest) {
      return { ok: false, fieldErrors: { transferToId: ["Akun tujuan tidak ditemukan"] } };
    }
  }

  if (data.type !== "transfer" && data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        OR: [{ userId }, { userId: null }],
      },
      select: { id: true, type: true },
    });
    if (!cat) {
      return { ok: false, fieldErrors: { categoryId: ["Kategori tidak valid"] } };
    }
    if (cat.type !== data.type) {
      return {
        ok: false,
        fieldErrors: {
          categoryId: ["Kategori tidak cocok dengan tipe transaksi"],
        },
      };
    }
  }

  return { ok: true };
}
