/**
 * Core transaction service — dipakai oleh Server Actions (browser path)
 * dan REST API (`/api/v1/*`).
 *
 * Tujuan: ada SATU sumber kebenaran untuk:
 *   - Validasi ownership (akun, kategori).
 *   - Atomic balance reconciliation lewat $transaction.
 *   - Rule revert-then-apply saat update.
 *
 * Kalau logika ini diduplikasi di dua tempat, bug saldo balance akan
 * gampang muncul saat salah satu jalur diperbarui tanpa yang lain.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type TransactionTypeInput,
} from "@/lib/utils/validators";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

interface TransactionRecord {
  id: string;
  type: TransactionTypeInput;
  accountId: string;
  categoryId: string | null;
  transferToId: string | null;
  amount: number;
  description: string | null;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

type Delta = { source: number; destination: number };

function balanceDelta(type: TransactionTypeInput, amount: number): Delta {
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

interface ParsedInput {
  type: TransactionTypeInput;
  accountId: string;
  categoryId?: string;
  transferToId?: string;
  amount: number;
  date: Date;
  description?: string;
  note?: string;
}

async function verifyOwnership(
  userId: string,
  data: ParsedInput,
): Promise<ServiceResult<null>> {
  const account = await prisma.financeAccount.findFirst({
    where: { id: data.accountId, userId },
    select: { id: true, isActive: true },
  });
  if (!account) {
    return {
      ok: false,
      error: "Akun tidak ditemukan",
      fieldErrors: { accountId: ["Akun tidak ditemukan"] },
    };
  }

  if (data.type === "transfer" && data.transferToId) {
    const dest = await prisma.financeAccount.findFirst({
      where: { id: data.transferToId, userId },
      select: { id: true },
    });
    if (!dest) {
      return {
        ok: false,
        error: "Akun tujuan tidak ditemukan",
        fieldErrors: { transferToId: ["Akun tujuan tidak ditemukan"] },
      };
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
      return {
        ok: false,
        error: "Kategori tidak valid",
        fieldErrors: { categoryId: ["Kategori tidak valid"] },
      };
    }
    if (cat.type !== data.type) {
      return {
        ok: false,
        error: "Kategori tidak cocok dengan tipe transaksi",
        fieldErrors: {
          categoryId: ["Kategori tidak cocok dengan tipe transaksi"],
        },
      };
    }
  }

  return { ok: true, data: null };
}

function serialize(tx: {
  id: string;
  type: string;
  accountId: string;
  categoryId: string | null;
  transferToId: string | null;
  amount: Prisma.Decimal;
  description: string | null;
  note: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}): TransactionRecord {
  return {
    id: tx.id,
    type: tx.type as TransactionTypeInput,
    accountId: tx.accountId,
    categoryId: tx.categoryId,
    transferToId: tx.transferToId,
    amount: Number(tx.amount),
    description: tx.description,
    note: tx.note,
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

// --- Public API ----------------------------------------------------------

export async function createTransactionService(
  userId: string,
  rawInput: Record<string, unknown>,
): Promise<ServiceResult<TransactionRecord>> {
  const parsed = createTransactionSchema.safeParse({
    type: rawInput.type,
    accountId: rawInput.accountId,
    amount: rawInput.amount,
    date: rawInput.date,
    description: rawInput.description ?? undefined,
    note: rawInput.note ?? undefined,
    categoryId: rawInput.categoryId ?? undefined,
    transferToId: rawInput.transferToId ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const ownership = await verifyOwnership(userId, data);
  if (!ownership.ok) return ownership;

  const delta = balanceDelta(data.type, data.amount);

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.transaction.create({
      data: {
        userId,
        type: data.type,
        accountId: data.accountId,
        categoryId: data.type === "transfer" ? null : data.categoryId ?? null,
        transferToId:
          data.type === "transfer" ? data.transferToId ?? null : null,
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

    return row;
  });

  return { ok: true, data: serialize(created) };
}

export async function updateTransactionService(
  userId: string,
  id: string,
  rawInput: Record<string, unknown>,
): Promise<ServiceResult<TransactionRecord>> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return { ok: false, error: "Transaksi tidak ditemukan" };
  }

  const parsed = updateTransactionSchema.safeParse({
    type: rawInput.type,
    accountId: rawInput.accountId,
    amount: rawInput.amount,
    date: rawInput.date,
    description: rawInput.description ?? undefined,
    note: rawInput.note ?? undefined,
    categoryId: rawInput.categoryId ?? undefined,
    transferToId: rawInput.transferToId ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const ownership = await verifyOwnership(userId, data);
  if (!ownership.ok) return ownership;

  const oldDelta = balanceDelta(
    existing.type as TransactionTypeInput,
    Number(existing.amount),
  );
  const newDelta = balanceDelta(data.type, data.amount);

  const updated = await prisma.$transaction(async (tx) => {
    await applyDelta(tx, existing.accountId, -oldDelta.source);
    if (existing.type === "transfer" && existing.transferToId) {
      await applyDelta(tx, existing.transferToId, -oldDelta.destination);
    }

    const row = await tx.transaction.update({
      where: { id },
      data: {
        type: data.type,
        accountId: data.accountId,
        categoryId: data.type === "transfer" ? null : data.categoryId ?? null,
        transferToId:
          data.type === "transfer" ? data.transferToId ?? null : null,
        amount: new Prisma.Decimal(data.amount),
        description: data.description ?? null,
        note: data.note ?? null,
        date: data.date,
      },
    });

    await applyDelta(tx, data.accountId, newDelta.source);
    if (data.type === "transfer" && data.transferToId) {
      await applyDelta(tx, data.transferToId, newDelta.destination);
    }

    return row;
  });

  return { ok: true, data: serialize(updated) };
}

export async function deleteTransactionService(
  userId: string,
  id: string,
): Promise<ServiceResult<null>> {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) {
    return { ok: false, error: "Transaksi tidak ditemukan" };
  }

  const oldDelta = balanceDelta(
    existing.type as TransactionTypeInput,
    Number(existing.amount),
  );

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id } });
    await applyDelta(tx, existing.accountId, -oldDelta.source);
    if (existing.type === "transfer" && existing.transferToId) {
      await applyDelta(tx, existing.transferToId, -oldDelta.destination);
    }
  });

  return { ok: true, data: null };
}

export async function getTransactionService(
  userId: string,
  id: string,
): Promise<ServiceResult<TransactionRecord>> {
  const row = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!row) {
    return { ok: false, error: "Transaksi tidak ditemukan" };
  }
  return { ok: true, data: serialize(row) };
}

export interface ListFilter {
  type?: TransactionTypeInput;
  accountId?: string;
  categoryId?: string;
  /** ISO date — inclusive. */
  startDate?: string;
  /** ISO date — exclusive. */
  endDate?: string;
  /** Substring match di description / note. */
  q?: string;
  limit: number;
  offset: number;
}

export async function listTransactionsService(
  userId: string,
  filter: ListFilter,
): Promise<{
  rows: TransactionRecord[];
  total: number;
}> {
  const where: Prisma.TransactionWhereInput = { userId };
  if (filter.type) where.type = filter.type;
  if (filter.accountId) {
    where.OR = [
      { accountId: filter.accountId },
      { transferToId: filter.accountId },
    ];
  }
  if (filter.categoryId) {
    where.categoryId = filter.categoryId === "none" ? null : filter.categoryId;
  }
  if (filter.startDate || filter.endDate) {
    where.date = {};
    if (filter.startDate) where.date.gte = new Date(filter.startDate);
    if (filter.endDate) where.date.lt = new Date(filter.endDate);
  }
  if (filter.q) {
    where.OR = [
      ...(where.OR ?? []),
      { description: { contains: filter.q } },
      { note: { contains: filter.q } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: filter.offset,
      take: filter.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    rows: rows.map(serialize),
    total,
  };
}
