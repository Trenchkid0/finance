"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";
import type { ActionResult } from "@/types";

const NAME_MAX = 64;

export interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * Bikin API key baru. Plain key SEKALI saja dikembalikan ke client —
 * setelah ini hilang dan tidak bisa dilihat lagi.
 */
export async function createApiKey(
  name: string,
): Promise<ActionResult<{ id: string; plain: string; prefix: string }>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, fieldErrors: { name: ["Nama kunci wajib diisi"] } };
  }
  if (trimmed.length > NAME_MAX) {
    return {
      ok: false,
      fieldErrors: { name: [`Nama maksimal ${NAME_MAX} karakter`] },
    };
  }

  // Batas wajar agar user tidak accidentally bikin ratusan key.
  const existing = await prisma.apiKey.count({
    where: { userId, revokedAt: null },
  });
  if (existing >= 10) {
    return {
      ok: false,
      error: "Maksimal 10 kunci aktif per akun. Cabut salah satu dulu.",
    };
  }

  const { plain, hash, prefix } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      userId,
      name: trimmed,
      keyPrefix: prefix,
      keyHash: hash,
    },
    select: { id: true },
  });

  revalidatePath("/settings");
  return { ok: true, data: { id: created.id, plain, prefix } };
}

export async function revokeApiKey(id: string): Promise<ActionResult<null>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId },
    select: { id: true, revokedAt: true },
  });
  if (!existing) {
    return { ok: false, error: "Kunci tidak ditemukan." };
  }
  if (existing.revokedAt) {
    return { ok: false, error: "Kunci sudah dicabut sebelumnya." };
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteApiKey(id: string): Promise<ActionResult<null>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Sesi berakhir, silakan masuk ulang." };
  }

  const existing = await prisma.apiKey.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Kunci tidak ditemukan." };
  }

  await prisma.apiKey.delete({ where: { id } });

  revalidatePath("/settings");
  return { ok: true };
}

/** Server-side fetch helper untuk Settings page. */
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  const rows = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.keyPrefix,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
