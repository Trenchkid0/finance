/**
 * Zod schemas for form & Server Action input validation.
 * AGENTS.md §5.4.
 */
import { z } from "zod";

// --- Reusable primitives -------------------------------------------------

/** Positive monetary amount in IDR (whole rupiah). */
export const moneyAmount = z
  .number({ invalid_type_error: "Jumlah harus berupa angka" })
  .positive("Jumlah harus lebih besar dari nol")
  .finite();

/** Non-empty trimmed string. */
export const requiredString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`);

// --- Auth ----------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// --- Transactions --------------------------------------------------------

export const transactionTypeEnum = z.enum(["income", "expense", "transfer"]);
export type TransactionTypeInput = z.infer<typeof transactionTypeEnum>;

const transactionFields = z.object({
  type: transactionTypeEnum,
  accountId: requiredString("Akun sumber"),
  amount: z.coerce
    .number({ invalid_type_error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0")
    .finite()
    .max(999_999_999_999, "Jumlah terlalu besar"),
  /** ISO date string from `<input type="date">`. Coerced to local-noon Date in the action. */
  date: z.coerce.date({ invalid_type_error: "Tanggal tidak valid" }),
  description: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
  categoryId: z.string().trim().optional(),
  transferToId: z.string().trim().optional(),
});

/**
 * Cross-field rules:
 *  - Transfer must specify a destination account, distinct from the source.
 *  - Income / expense must specify a category.
 */
function applyCrossFieldRules(data: z.infer<typeof transactionFields>, ctx: z.RefinementCtx) {
  if (data.type === "transfer") {
    if (!data.transferToId) {
      ctx.addIssue({
        code: "custom",
        path: ["transferToId"],
        message: "Akun tujuan wajib dipilih",
      });
    } else if (data.transferToId === data.accountId) {
      ctx.addIssue({
        code: "custom",
        path: ["transferToId"],
        message: "Akun tujuan harus berbeda dari akun sumber",
      });
    }
  } else {
    if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Kategori wajib dipilih",
      });
    }
  }
}

export const createTransactionSchema = transactionFields.superRefine(applyCrossFieldRules);
export const updateTransactionSchema = transactionFields.superRefine(applyCrossFieldRules);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

// --- Accounts -----------------------------------------------------------

export const accountTypeEnum = z.enum(["bank", "wallet", "cash", "investment"]);
export type AccountTypeInput = z.infer<typeof accountTypeEnum>;

export const createAccountSchema = z.object({
  name: requiredString("Nama akun"),
  type: accountTypeEnum,
  balance: z.coerce
    .number({ invalid_type_error: "Saldo harus berupa angka" })
    .finite()
    .max(999_999_999_999, "Saldo terlalu besar"),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updateAccountSchema = createAccountSchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

