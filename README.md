# Digital Heroes — Web-to-Print Platform

Configure, design, proof and order custom print across six divisions: labels & stickers, race & event numbers, MTB boards, stamps, trophies and laser-cut work.

- Plan and PRD coverage: [`plan.md`](./plan.md)
- Every decision and PRD interpretation: [`decisions.md`](./decisions.md)

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Stripe · Resend · Vercel

## Getting started

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # fill in Supabase, Stripe and Resend keys
npm run db:push              # apply migrations + catalogue seed to Supabase
npm run db:types             # regenerate src/lib/supabase/database.types.ts
npm run db:seed-users        # create/reset the test accounts below
npm run dev                  # http://localhost:3000
```

Supabase dashboard settings: **Auth → Email → Confirm email: off** (D-033) and **Auth → URL Configuration**: Site URL = the app URL, redirect URL `<app URL>/**`.

## Test credentials

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@example.com` | `DemoCustomer#2026` |
| Admin | `demo.admin@example.com` | `DemoAdmin#2026` |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates Next.js route types, then `tsc --noEmit` |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:integration` | Live RLS/permission tests against the Supabase project |
| `npm run test:e2e` | Playwright end-to-end tests (desktop + mobile) against a running app; set `E2E_BASE_URL` to target another URL |
| `npm run check` | Lint + typecheck + tests |
| `npm run db:push` / `db:types` / `db:seed-users` | Database migrations, generated types, test accounts |

## Project structure

```
src/
├── app/          # routes only — thin adapters into module controllers
├── modules/      # one folder per feature: controller · validator · service · repository
├── components/   # shared UI
├── constants/    # one file per concern (limits, site-config, pipeline, roles, storage …)
├── config/       # env.server.ts / env.public.ts — the only places env vars are read
└── lib/          # shared infrastructure (Supabase clients, errors, money, units)
supabase/         # migrations and seed
tests/            # unit (Vitest) and e2e (Playwright)
docs/             # database schema
```

Conventions are described in `plan.md` §2.

_Live URL, test credentials and schema docs are added as phases complete._
