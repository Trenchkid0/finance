# Maybe Finance

Personal finance dashboard — a "Maybe Finance" clone built per the design and engineering rules in [`../AGENTS.md`](../AGENTS.md).

## Stack
Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v3 · Prisma · MySQL · NextAuth.js (Auth.js v5) · Recharts · Lucide

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# Edit .env: set DATABASE_URL and AUTH_SECRET (npx auth secret)

# 3. Initialize the database
npm run db:generate
npm run db:migrate

# 4. Run dev server
npm run dev
```

App runs on http://localhost:3000.

## Project structure

See [`AGENTS.md`](../AGENTS.md) §6 — Section 6 of that document is the authoritative folder map.

## Workflow

This project follows step-by-step execution (AGENTS.md §7). Each prompt
should target a single feature: auth → accounts → transactions → dashboard
widgets → charts → budgets → investments → import/export.

## Status

See [`AGENTS.md`](../AGENTS.md) §8 — single source of truth for project state.
