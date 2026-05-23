import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /transactions/export — generate CSV dari transaksi user.
 *
 * Query params (sama dengan filter di /transactions):
 *   - type, accountId, categoryId, startDate, endDate, q
 *
 * Output:
 *   - `Content-Type: text/csv; charset=utf-8`
 *   - `Content-Disposition: attachment; filename="transactions-YYYYMMDD.csv"`
 *
 * BOM (\uFEFF) dipasang di awal supaya Excel detect UTF-8 dengan benar
 * untuk karakter spesial (Rp, é, dll). Tanpa BOM, Excel akan membaca
 * sebagai Windows-1252 dan merusak nama kategori non-ASCII.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const where = buildWhere(userId, url.searchParams);

  const rows = await prisma.transaction.findMany({
    where,
    include: {
      account: { select: { name: true } },
      transferTo: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 10_000, // hard cap supaya tidak meledak di akun raksasa
  });

  const headers = [
    "Tanggal",
    "Tipe",
    "Jumlah (IDR)",
    "Akun",
    "Akun Tujuan",
    "Kategori",
    "Deskripsi",
    "Catatan",
  ];

  const lines = [headers.map(csvCell).join(",")];

  for (const tx of rows) {
    const date = tx.date.toISOString().slice(0, 10);
    const type =
      tx.type === "income"
        ? "Pemasukan"
        : tx.type === "expense"
          ? "Pengeluaran"
          : "Transfer";

    lines.push(
      [
        date,
        type,
        Number(tx.amount).toString(),
        tx.account.name,
        tx.transferTo?.name ?? "",
        tx.category?.name ?? "",
        tx.description ?? "",
        tx.note ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const csv = "\uFEFF" + lines.join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Escape sel CSV per RFC 4180 — bungkus dengan quote bila perlu, double quote internal. */
function csvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildWhere(
  userId: string,
  params: URLSearchParams,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };

  const type = params.get("type");
  if (type === "income" || type === "expense" || type === "transfer") {
    where.type = type;
  }

  const accountId = params.get("accountId");
  if (accountId && accountId !== "all") {
    where.OR = [{ accountId }, { transferToId: accountId }];
  }

  const categoryId = params.get("categoryId");
  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId === "none" ? null : categoryId;
  }

  const q = params.get("q");
  if (q && q.trim().length > 0) {
    const insensitive: Prisma.StringNullableFilter = { contains: q.trim() };
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      { OR: [{ description: insensitive }, { note: insensitive }] },
    ];
  }

  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      dateFilter.gte = new Date(`${startDate}T00:00:00`);
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const end = new Date(`${endDate}T00:00:00`);
      end.setDate(end.getDate() + 1);
      dateFilter.lt = end;
    }
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;
  }

  return where;
}
