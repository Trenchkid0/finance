import type { NextRequest } from "next/server";
import {
  authenticateApi,
  errorResponse,
  okResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import { scanTransactionTextForUser } from "@/lib/services/ai-scan";

/**
 * POST /api/v1/ai/scan
 * Body: { text: string }
 *
 * Mem-parse teks transaksi (struk, SMS bank, notifikasi) ke struktur
 * yang sama dengan tab "Scan AI" di UI. TIDAK menyimpan transaksi —
 * caller bisa pakai `POST /api/v1/transactions` setelahnya.
 *
 * Berguna untuk bot Telegram: user kirim foto/teks → bot OCR → kirim
 * teks ke endpoint ini → konfirmasi ke user → create transaction.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const [body, parseError] = await parseJsonBody<{ text?: unknown }>(req);
  if (parseError) return parseError;

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return errorResponse(
      400,
      "missing_text",
      "Field `text` wajib diisi dengan teks transaksi.",
    );
  }

  const result = await scanTransactionTextForUser(auth.userId, text);
  if (!result.ok) {
    return errorResponse(
      result.code === "ai_disabled" ? 503 : 400,
      result.code,
      result.error,
    );
  }

  return okResponse(result.candidate);
}
