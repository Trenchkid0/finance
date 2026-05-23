/**
 * AI scan service — dipakai oleh Server Action `scanTransactionText`
 * dan REST endpoint `POST /api/v1/ai/scan`.
 *
 * Tanggung jawab:
 *   - Authorize user-scoped data (akun + kategori).
 *   - Susun prompt deterministik untuk DeepSeek.
 *   - Sanitize output (ID validation, amount normalize, date check).
 *
 * Tidak melakukan side effect (tidak insert ke DB).
 */

import { prisma } from "@/lib/prisma";
import {
  deepseekJSON,
  DeepSeekError,
  isDeepSeekConfigured,
} from "@/lib/deepseek";

export type AIScanType = "income" | "expense" | "transfer";

export interface AIScanCandidate {
  type: AIScanType;
  amount: number;
  date: string | null;
  description: string | null;
  accountId: string | null;
  transferToId: string | null;
  categoryId: string | null;
  confidence: number;
  reasoning: string | null;
}

export type AIScanResult =
  | { ok: true; candidate: AIScanCandidate }
  | { ok: false; code: AIScanErrorCode; error: string };

export type AIScanErrorCode =
  | "ai_disabled"
  | "invalid_input"
  | "no_accounts"
  | "ai_failed"
  | "unrecognized";

const MAX_INPUT_CHARS = 4_000;

export async function scanTransactionTextForUser(
  userId: string,
  rawInput: string,
): Promise<AIScanResult> {
  if (!isDeepSeekConfigured()) {
    return {
      ok: false,
      code: "ai_disabled",
      error:
        "Scan AI belum tersedia. Tambahkan DEEPSEEK_API_KEY di server untuk mengaktifkan.",
    };
  }

  const input = rawInput.trim();
  if (input.length < 10) {
    return {
      ok: false,
      code: "invalid_input",
      error:
        "Teks terlalu pendek. Tempel minimal 1 baris struk atau notifikasi.",
    };
  }
  if (input.length > MAX_INPUT_CHARS) {
    return {
      ok: false,
      code: "invalid_input",
      error: `Teks terlalu panjang (maks ${MAX_INPUT_CHARS} karakter).`,
    };
  }

  const [accounts, categories] = await Promise.all([
    prisma.financeAccount.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true, type: true, icon: true },
    }),
  ]);

  if (accounts.length === 0) {
    return {
      ok: false,
      code: "no_accounts",
      error: "Tambahkan akun terlebih dahulu sebelum memakai Scan AI.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = [
    "Anda adalah asisten parsing transaksi keuangan berbahasa Indonesia.",
    "Tugas: ekstrak satu transaksi dari teks bebas (struk belanja, notifikasi SMS bank, screenshot e-wallet, catatan harian).",
    "Selalu jawab dengan satu objek JSON yang valid sesuai skema.",
    "Jangan tambahkan komentar atau teks di luar JSON.",
  ].join(" ");

  const accountList = accounts
    .map((a) => `- id="${a.id}" name="${a.name}" type=${a.type}`)
    .join("\n");
  const incomeCategories = categories
    .filter((c) => c.type === "income")
    .map((c) => `- id="${c.id}" name="${c.name}"`)
    .join("\n");
  const expenseCategories = categories
    .filter((c) => c.type === "expense")
    .map((c) => `- id="${c.id}" name="${c.name}"`)
    .join("\n");

  const schemaHint = `{
  "type": "income" | "expense" | "transfer",
  "amount": number (whole rupiah, tanpa pemisah),
  "date": "YYYY-MM-DD" | null,
  "description": "string singkat <= 80 char" | null,
  "accountId": "salah satu id dari daftar akun" | null,
  "transferToId": "id akun tujuan untuk transfer, null untuk income/expense",
  "categoryId": "id kategori income/expense yang cocok, null untuk transfer atau jika tidak yakin",
  "confidence": "angka 0..1",
  "reasoning": "kalimat pendek menjelaskan kesimpulan"
}`;

  const userPrompt = `
Hari ini: ${today} (gunakan ini bila tanggal tidak disebut di teks)

Daftar akun pengguna (pilih id-nya, JANGAN bikin baru):
${accountList || "(belum ada akun)"}

Daftar kategori income (untuk type=income):
${incomeCategories || "(kosong)"}

Daftar kategori expense (untuk type=expense):
${expenseCategories || "(kosong)"}

Aturan:
- Jika teks menunjukkan uang masuk (gajian, pemasukan, terima dari, refund) → type=income.
- Jika teks menunjukkan pembayaran/pengeluaran (belanja, top-up, bayar tagihan) → type=expense.
- Jika menunjukkan pemindahan dana antar akun pengguna sendiri → type=transfer dan isi transferToId.
- "amount" wajib angka tanpa "Rp", titik, atau koma. Contoh: 125000 (BUKAN "Rp 125.000").
- Pilih accountId paling cocok berdasarkan nama/jenis (BCA, GoPay, OVO, Mandiri, Tunai, dll).
- Untuk income/expense, pilih categoryId yang relevan; isi null kalau tidak ada yang cocok.
- "date" harus format YYYY-MM-DD; kalau teks bilang "kemarin", "hari ini", dll., hitung dari hari ini.
- Jika ragu pada salah satu field, isi null daripada menebak.
- "confidence" 0..1 — jujur. Kalau teks ambigu, set < 0.5.

Skema JSON yang harus Anda kembalikan:
${schemaHint}

Teks transaksi:
"""
${input}
"""
`.trim();

  let raw: Partial<AIScanCandidate> & { amount?: unknown };
  try {
    raw = await deepseekJSON<Partial<AIScanCandidate> & { amount?: unknown }>({
      systemPrompt,
      userPrompt,
    });
  } catch (err) {
    return {
      ok: false,
      code: "ai_failed",
      error:
        err instanceof DeepSeekError
          ? err.message
          : "Terjadi kesalahan tidak terduga pada AI.",
    };
  }

  const candidate = sanitizeCandidate(raw, accounts, categories);
  if (!candidate) {
    return {
      ok: false,
      code: "unrecognized",
      error: "AI gagal mengenali transaksi. Coba teks yang lebih lengkap.",
    };
  }

  return { ok: true, candidate };
}

// --- Sanitization --------------------------------------------------------

interface AccountRow {
  id: string;
  name: string;
  type: string;
}
interface CategoryRow {
  id: string;
  name: string;
  type: string;
  icon: string | null;
}

function sanitizeCandidate(
  raw: Partial<AIScanCandidate> & { amount?: unknown },
  accounts: AccountRow[],
  categories: CategoryRow[],
): AIScanCandidate | null {
  const type = normalizeType(raw.type);
  if (!type) return null;

  const amount = normalizeAmount(raw.amount);
  if (amount === null || amount <= 0) return null;

  const accountId = pickValidId(
    raw.accountId,
    accounts.map((a) => a.id),
  );
  const transferToId =
    type === "transfer"
      ? pickValidId(
          raw.transferToId,
          accounts.map((a) => a.id),
        )
      : null;

  const sanitizedTransferToId =
    transferToId && transferToId === accountId ? null : transferToId;

  const categoryId =
    type === "transfer"
      ? null
      : pickValidId(
          raw.categoryId,
          categories.filter((c) => c.type === type).map((c) => c.id),
        );

  const date = normalizeDate(raw.date);

  const description =
    typeof raw.description === "string"
      ? raw.description.trim().slice(0, 80) || null
      : null;

  const confidence =
    typeof raw.confidence === "number" &&
    Number.isFinite(raw.confidence) &&
    raw.confidence >= 0 &&
    raw.confidence <= 1
      ? raw.confidence
      : 0.5;

  const reasoning =
    typeof raw.reasoning === "string" && raw.reasoning.trim().length > 0
      ? raw.reasoning.trim().slice(0, 200)
      : null;

  return {
    type,
    amount,
    date,
    description,
    accountId,
    transferToId: sanitizedTransferToId,
    categoryId,
    confidence,
    reasoning,
  };
}

function normalizeType(value: unknown): AIScanType | null {
  if (value === "income" || value === "expense" || value === "transfer") {
    return value;
  }
  return null;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(Math.abs(value));
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "").replace(/\./g, "");
    const num = Number(cleaned);
    if (Number.isFinite(num)) return Math.round(Math.abs(num));
  }
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const oneYearAhead = new Date();
  oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
  if (d.getTime() > oneYearAhead.getTime()) return null;
  return value;
}

function pickValidId(value: unknown, allowed: string[]): string | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value) ? value : null;
}
