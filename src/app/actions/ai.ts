"use server";

import { auth } from "@/lib/auth";
import {
  scanTransactionTextForUser,
  type AIScanCandidate,
} from "@/lib/services/ai-scan";

/**
 * Server Action wrapper di atas `scanTransactionTextForUser`.
 * Dipanggil dari TransactionForm tab "Scan AI".
 */

export type { AIScanCandidate };

export type AIScanResult =
  | { ok: true; candidate: AIScanCandidate }
  | { ok: false; error: string };

export async function scanTransactionText(
  rawInput: string,
): Promise<AIScanResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const result = await scanTransactionTextForUser(userId, rawInput);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, candidate: result.candidate };
}
