/**
 * App-wide constants: routes, color maps, default categories.
 * AGENTS.md §5.4.
 */

export const ROUTES = {
  login: "/login",
  register: "/register",
  dashboard: "/",
  accounts: "/accounts",
  transactions: "/transactions",
  income: "/income",
  expenses: "/expenses",
  budget: "/budget",
  settings: "/settings",
} as const;

/** Chart palette — AGENTS.md §4.9. */
export const CHART_COLORS = {
  income: "#2EA043",
  expense: "#F85149",
  savings: "#388BFD",
  investment: "#D29922",
  neutral: "#8B949E",
  categories: ["#388BFD", "#2EA043", "#D29922", "#F85149", "#A371F7", "#39D353"],
} as const;

export type AccountType = "bank" | "wallet" | "cash" | "investment";
export type TransactionType = "income" | "expense" | "transfer";
