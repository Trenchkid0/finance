import type { NextRequest } from "next/server";
import {
  authenticateApi,
  errorResponse,
  okResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  deleteTransactionService,
  getTransactionService,
  updateTransactionService,
} from "@/lib/services/transactions";

/**
 * GET    /api/v1/transactions/:id
 * PATCH  /api/v1/transactions/:id   — update full body, saldo akun ter-rekonsiliasi.
 * DELETE /api/v1/transactions/:id   — saldo akun ter-rekonsiliasi otomatis.
 */

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await getTransactionService(auth.userId, id);
  if (!result.ok) {
    return errorResponse(404, "not_found", result.error);
  }
  return okResponse(result.data);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const [body, parseError] = await parseJsonBody<Record<string, unknown>>(req);
  if (parseError) return parseError;
  if (!body) {
    return errorResponse(400, "missing_body", "Body request kosong.");
  }

  const result = await updateTransactionService(auth.userId, id, body);
  if (!result.ok) {
    if (result.error === "Transaksi tidak ditemukan") {
      return errorResponse(404, "not_found", result.error);
    }
    return errorResponse(
      result.fieldErrors ? 422 : 400,
      "validation_failed",
      result.error,
      result.fieldErrors,
    );
  }
  return okResponse(result.data);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const result = await deleteTransactionService(auth.userId, id);
  if (!result.ok) {
    return errorResponse(404, "not_found", result.error);
  }
  return okResponse({ id, deleted: true });
}
