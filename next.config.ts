import type { NextConfig } from "next";

/**
 * Standalone output dipakai HANYA untuk Docker build (Linux container).
 *
 * Kenapa env-gated: Next 15 + route groups `(auth)` punya bug di
 * Windows tracing yang melempar `PageNotFoundError: /register` ketika
 * `output: "standalone"` aktif. Di Linux container build (yang dipakai
 * Docker), masalah ini tidak muncul.
 *
 * Set `BUILD_STANDALONE=1` di Dockerfile sebelum `npm run build`.
 * Lokal `npm run build` di host tidak terpengaruh.
 */
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
};

export default nextConfig;
