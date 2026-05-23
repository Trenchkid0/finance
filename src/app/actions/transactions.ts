"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  createTransactionService,
  deleteTransactionService,
  updateTransactionService,
} from "@/lib/services/transactions";
import type { ActionResult } from "@/types";

/**
 * Transaction Server Actions — thin adapters di atas
 * `lib/services/transactions`. Logic balance reconciliation, validation,
 * dan ownership ada di service supaya jalur REST API berbagi kode yang
 * sama (AGENTS.md §5.2: tetap pakai Server Action untuk form).
 */

const MUTATION_PATHS = ["/transactions", "/", "/accounts"] as const;

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

function toActionResult<T>(
  result: Awaited<ReturnType<typeof createTransactionService>>,
): ActionResult<T> {
  if (result.ok) return { ok: true };
  return {
    ok: false,
    error: result.fieldErrors ? undefined : result.error,
    fieldErrors: result.fieldErrors,
  };
}

export async function createTransaction(
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const result = await createTransactionService(userId, {
    type: getString(formData, "type"),
    accountId: getString(formData, "accountId"),
    amount: getString(formData, "amount"),
    date: getString(formData, "date"),
    description: getString(formData, "description"),
    note: getString(formData, "note"),
    categoryId: getString(formData, "categoryId"),
    transferToId: getString(formData, "transferToId"),
  });

  if (result.ok) revalidate();
  return toActionResult<null>(result);
}

export async function updateTransaction(
  id: string,
  _prev: ActionResult<null> | undefined,
  formData: FormData,
): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const result = await updateTransactionService(userId, id, {
    type: getString(formData, "type"),
    accountId: getString(formData, "accountId"),
    amount: getString(formData, "amount"),
    date: getString(formData, "date"),
    description: getString(formData, "description"),
    note: getString(formData, "note"),
    categoryId: getString(formData, "categoryId"),
    transferToId: getString(formData, "transferToId"),
  });

  if (result.ok) revalidate();
  return toActionResult<null>(result);
}

export async function deleteTransaction(id: string): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };

  const result = await deleteTransactionService(userId, id);
  if (result.ok) revalidate();

  if (result.ok) return { ok: true };
  return { ok: false, error: result.error };
}
