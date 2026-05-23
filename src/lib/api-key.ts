import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Personal-access-token (PAT) helpers.
 *
 * Anatomy of a key:
 *   bc90e40a7e761514ee9eba70f009689269e7e3bce8925f5df2bd9269bdcca9a1
 *   └────── 64 hex chars (32 random bytes) ────────────────────────┘
 *
 * Hex polos tanpa prefix supaya cocok dengan format API key umum
 * (DeepSeek, Stripe-style hex, dsb). Format kompak, tahan
 * copy-paste, dan tidak membocorkan brand di token sehingga lebih
 * netral bila user pakai untuk script lintas platform.
 *
 * Storage:
 *   - `keyPrefix`  → 12 char awal untuk display ("bc90e40a7e76…") — bukan rahasia
 *   - `keyHash`    → SHA-256 hex dari plain key, dipakai untuk lookup
 *
 * Plain key tidak pernah disimpan. User wajib salin saat key dibuat.
 *
 * Kenapa SHA-256 dan bukan bcrypt?
 *   API key punya entropy tinggi (256-bit random) sehingga rainbow-table
 *   attack tidak relevan. SHA-256 hex memungkinkan equality lookup di
 *   query Prisma — bcrypt akan paksa kita scan semua row + verify satu
 *   per satu, yang bottleneck pada API hot path.
 */

const RANDOM_BYTES = 32; // 32 bytes → 64 hex chars (256-bit entropy)
const KEY_LENGTH = RANDOM_BYTES * 2; // 64
const DISPLAY_PREFIX_LENGTH = 12;
/** Regex format mentah — hex lowercase, panjang persis. */
const KEY_REGEX = new RegExp(`^[0-9a-f]{${KEY_LENGTH}}$`);

/** Generate plain key + sha256 hash + display prefix. */
export function generateApiKey(): {
  plain: string;
  hash: string;
  prefix: string;
} {
  const plain = randomBytes(RANDOM_BYTES).toString("hex");
  return {
    plain,
    hash: hashApiKey(plain),
    prefix: plain.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

/** Compute the storage hash for a plain key. */
export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

/**
 * Constant-time compare guard for a plain key against a stored hash.
 * Walaupun kita pakai equality query di Prisma, di tempat lain
 * (mis. webhook signature) kita harus pakai ini supaya tidak bocor
 * lewat timing.
 */
export function safeEqualHash(a: string, b: string): boolean {
  try {
    const buf = Buffer.from(a, "hex");
    const cmp = Buffer.from(b, "hex");
    if (buf.length !== cmp.length) return false;
    return timingSafeEqual(buf, cmp);
  } catch {
    return false;
  }
}

/** Lightweight format check — bukan validation autentik, hanya untuk fail fast. */
export function looksLikeApiKey(input: string): boolean {
  return KEY_REGEX.test(input);
}
