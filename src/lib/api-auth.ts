import { NextResponse, type NextRequest } from "next/server";
import { hashApiKey, looksLikeApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

/**
 * Authenticate REST API requests via Bearer API key.
 *
 * Usage in route handlers:
 *
 *   const auth = await authenticateApi(req);
 *   if (!auth.ok) return auth.response;
 *   const { userId } = auth;
 *
 * Pola "ok | response" ini meniru Result type — handler tidak perlu
 * try/catch dan tidak ada thrown error yang lewat ke client tanpa
 * format JSON yang konsisten.
 */

export type ApiAuthResult =
  | { ok: true; userId: string; apiKeyId: string }
  | { ok: false; response: NextResponse };

export async function authenticateApi(
  req: NextRequest,
): Promise<ApiAuthResult> {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "missing_authorization",
        "Header Authorization: Bearer <api_key> wajib diisi.",
      ),
    };
  }

  const plainKey = match[1].trim();
  if (!looksLikeApiKey(plainKey)) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "invalid_api_key_format",
        "Format kunci API tidak dikenali.",
      ),
    };
  }

  const hash = hashApiKey(plainKey);
  const row = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!row || row.revokedAt) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "invalid_api_key",
        "Kunci API tidak valid atau sudah dicabut.",
      ),
    };
  }

  // Update lastUsedAt async — kita tidak menunggunya supaya request
  // tidak terblokir oleh write log. Error di-swallow karena ini cuma
  // metric, bukan jalur kritis.
  prisma.apiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* noop */
    });

  return { ok: true, userId: row.userId, apiKeyId: row.id };
}

// --- Standard JSON helpers -----------------------------------------------

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message, fieldErrors } },
    { status },
  );
}

export function okResponse<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Parse JSON body dengan error friendly. Mengembalikan tuple
 * `[body, errorResponse]`. Penjelasan koreksi: kita PERLU bedakan
 * antara "body kosong tapi schema mengizinkan" dan "body invalid".
 */
export async function parseJsonBody<T = unknown>(
  req: NextRequest,
): Promise<[T | null, NextResponse | null]> {
  if (req.headers.get("content-length") === "0") {
    return [null, null];
  }
  try {
    const json = (await req.json()) as T;
    return [json, null];
  } catch {
    return [
      null,
      errorResponse(
        400,
        "invalid_json",
        "Body request bukan JSON yang valid.",
      ),
    ];
  }
}
