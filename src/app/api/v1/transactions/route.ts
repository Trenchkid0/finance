import type { NextRequest } from "next/server";
import {
  authenticateApi,
  errorResponse,
  okResponse,
  parseJsonBody,
} from "@/lib/api-auth";
import {
  createTransactionService,
  listTransactionsService,
} from "@/lib/services/transactions";

/**
 * GET /api/v1/transactions
 *   Query params:
 *     - type: income | expense | transfer
 *     - accountId: string
 *     - categoryId: string | "none"
 *     - startDate, endDate: ISO date (YYYY-MM-DD)
 *     - q: substring di description / note
 *     - limit: 1..100 (default 50)
 *     - offset: >=0 (default 0)
 *
 * POST /api/v1/transactions
 *   Body: { type, accountId, amount, date, description?, note?, categoryId?, transferToId? }
 *
 *   Saldo akun ter-reconcile otomatis (incl. transfer ganda).
 */

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const get = (k: string) => url.searchParams.get(k) ?? undefined;

  const limitRaw = Number(get("limit") ?? DEFAULT_LIMIT);
  const offsetRaw = Number(get("offset") ?? 0);

  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetRaw)
    ? Math.max(0, Math.floor(offsetRaw))
    : 0;

  const typeRaw = get("type");
  const type =
    typeRaw === "income" || typeRaw === "expense" || typeRaw === "transfer"
      ? typeRaw
      : undefined;

  const result = await listTransactionsService(auth.userId, {
    type,
    accountId: get("accountId"),
    categoryId: get("categoryId"),
    startDate: get("startDate"),
    endDate: get("endDate"),
    q: get("q"),
    limit,
    offset,
  });

  return okResponse({
    items: result.rows,
    pagination: {
      total: result.total,
      limit,
      offset,
      hasMore: offset + result.rows.length < result.total,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (!auth.ok) return auth.response;

  const [body, parseError] = await parseJsonBody<Record<string, unknown>>(req);
  if (parseError) return parseError;
  if (!body || typeof body !== "object") {
    return errorResponse(400, "missing_body", "Body request kosong.");
  }

  const result = await createTransactionService(auth.userId, body);
  if (!result.ok) {
    return errorResponse(
      result.fieldErrors ? 422 : 400,
      "validation_failed",
      result.error,
      result.fieldErrors,
    );
  }

  return okResponse(result.data, { status: 201 });
}
