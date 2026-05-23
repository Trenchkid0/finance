/**
 * Global type definitions.
 * AGENTS.md §6.
 *
 * Domain types should be derived from Prisma via `Prisma.<Model>GetPayload<...>`
 * (see AGENTS.md §5.3). This file is for cross-cutting types only —
 * pagination envelopes, API response shapes, UI props that aren't tied to a
 * single component, etc.
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
