/**
 * Thin DeepSeek client.
 *
 * DeepSeek's chat completion API is OpenAI-compatible, so we just hit
 * the REST endpoint directly with `fetch` instead of pulling the OpenAI
 * SDK as a dependency. This keeps the bundle lean and decouples us from
 * SDK version drift.
 *
 * Usage:
 *   const out = await deepseekJSON({
 *     systemPrompt: "...",
 *     userPrompt: "...",
 *     responseSchemaHint: "{ ... }",
 *   });
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export class DeepSeekError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

interface JsonRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Pakai `deepseek-chat` untuk respon cepat / murah; default cocok untuk parsing struk. */
  model?: string;
  /** Ditampilkan di prompt sebagai contoh bentuk JSON yang diinginkan. */
  responseSchemaHint?: string;
  /** Suhu rendah → output stabil & deterministik. */
  temperature?: number;
}

/**
 * Minta DeepSeek mengembalikan JSON yang sudah ter-parse.
 * Lempar `DeepSeekError` kalau API gagal atau JSON tidak valid.
 */
export async function deepseekJSON<T>(req: JsonRequest): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY belum dikonfigurasi di server.",
    );
  }

  const body = {
    model: req.model ?? "deepseek-chat",
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user", content: req.userPrompt },
    ],
    temperature: req.temperature ?? 0.1,
    // DeepSeek mendukung JSON mode mirip OpenAI.
    response_format: { type: "json_object" as const },
  };

  let res: Response;
  try {
    res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      // 30s timeout via AbortController — DeepSeek occasionally takes
      // ~10s for cold starts and we don't want the action to hang.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new DeepSeekError("Gagal menghubungi layanan AI.", err);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DeepSeekError(
      `Layanan AI menolak permintaan (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new DeepSeekError("Respon AI tidak bisa di-parse.", err);
  }

  const content = extractMessageContent(json);
  if (!content) {
    throw new DeepSeekError("Respon AI tidak berisi pesan.");
  }

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new DeepSeekError(
      `AI mengembalikan JSON tidak valid: ${content.slice(0, 200)}`,
      err,
    );
  }
}

interface DeepSeekChatResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

function extractMessageContent(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as DeepSeekChatResponse;
  const content = obj.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

export function isDeepSeekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}
