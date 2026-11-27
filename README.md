# Makeready — web-to-print platform by Digital Heroes

Configure, design, proof and order custom print across six divisions: labels & stickers, race & event numbers, MTB boards, stamps, trophies and laser-cut work. Staff run every job from quote to completed in one production console.

*Makeready* is the printer's term for the setup work before a press run: this platform doesn't stop at an artwork upload, it turns an approved design into production-ready files.

**Live:** https://makeready-umber.vercel.app

| | |
|---|---|
| Plan and PRD coverage | [`plan.md`](./plan.md) |
| Every decision and how ambiguities were resolved | [`decisions.md`](./decisions.md) (D-001 … D-072) |
| Database schema, ERD, RLS, storage | [`docs/schema.md`](./docs/schema.md) |

## Test credentials

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@example.com` | `DemoCustomer#2026` |
| Admin | `demo.admin@example.com` | `DemoAdmin#2026` |

Payments run in **Stripe test mode**: use card `4242 4242 4242 4242`, any future expiry, any CVC. You can also sign up with any email (no confirmation step).

## Try it in ten minutes

**As a customer**
1. Home → move the quantity slider on the job ticket: the price and volume discount update instantly.
2. Products → *Race & Event Numbers* → choose a size and material → **Merge names and numbers from a spreadsheet** → pick a template.
3. In the designer, open *Spreadsheet*, download the sample CSV, add ten rows and upload it. Step through rows; an over-long name is flagged with its row number and saving is blocked until it fits.
4. Or use *Custom Labels* → **Design it online**: edit text, fonts and colours, add a logo, drag and rotate (it can't leave the dashed print area), **Preview proof**, **Save design**, **Add to basket**.
5. Basket → choose collection or a UK address → **Pay securely with Stripe** (test card).
6. On the order page, **Request changes** → edit the design → **Save design** → **Submit design v2** → **Approve proof v2**. The order moves to production.
7. *My account* shows proofs awaiting you, saved designs, invoice PDFs and **Reorder** (same approved artwork, straight to production).

**As an admin** (`/admin`)
1. **Pipeline**: jobs by stage, ready-for-production indicators, *Mark complete*.
2. **Job database**: filter by status, customer, date and product family → open a job → download the vector PDF / PNG / per-row CSV files or everything as a ZIP.
3. **Reports**: orders, revenue, VAT and product-family throughput; **Download Xero CSV**.
4. **Products & templates**: create a division or product, edit pricing, materials, size rules, volume discounts and templates (with live previews). **Users**: roles and disabling. **Gallery** and **Archive**.

## What's built, by PRD section

| PRD | Delivered | Where |
|---|---|---|
| §03 Roles | Visitor / customer / admin enforced by RLS on every table, server-side role checks, admin area hidden (404) from others | `supabase/migrations/*rls*`, `src/modules/auth` |
| §04 Catalogue | Six divisions; one parameter-driven product per job type (custom size ranges or presets, orientations, materials, quantity bounds); per-placeholder fitting rules | `src/modules/catalogue` |
| §05 Pricing & checkout | Instant shared pricing engine, automatic volume tiers from 100 units, VAT-inclusive totals, delivery shown up front, Stripe Checkout, server re-pricing, idempotent fulfilment, Xero-shaped invoices; no subscriptions | `src/modules/pricing`, `cart`, `payments`, `invoices` |
| §06 Designer | Templates, text/fonts/sizes/colours, logos, move/resize/rotate locked to print areas, undo/redo, real-time proof preview, upload path (PDF/SVG/AI/PNG, checked by bytes), saved designs | `src/modules/designer` |
| §07 Print files | Server-side vector PDFs with TrimBox/BleedBox, PNGs at product DPI, CSV merge → one PDF per row + merged PDF, `OrderID_ProductType_Date_Output` naming, queued and batched | `src/modules/print-files` |
| §08 Proofs | Versioned proofs (v1, v2…), approval log (who/which/when/comment), change requests, approval gate enforced in the service and tests | `src/modules/proofs`, `orders.service.transition` |
| §09–10 Accounts & dashboard | Auth, order history with status, saved designs, active proofs, one-click reorder, invoice PDFs, profile status | `src/app/account` |
| §11 Production console | Pipeline board, searchable job database, ready indicators, file and ZIP downloads, status moves, reports, archive, users, catalogue/templates, gallery | `src/app/admin` |
| §12 UI/UX | Press-room design system (process-magenta accent, Jost + IBM Plex Sans), equal-weight product hub, live calculator, gallery by family, mobile-first | `src/app/globals.css`, D-038 |
| §13 Technical | Next.js + React + Tailwind, Supabase, server-side file generation, emails (Resend), HSTS + security headers, Lighthouse 98–100 | — |
| §14 Scalability | Divisions/products/templates are data; organizations for company accounts; versioned `/api/v1`; `AccountingProvider` with Xero API stub | D-016, D-017, D-018, D-070 |

## Architecture

- **Next.js 16** (App Router) on **Vercel**; **Supabase** Postgres, Auth and Storage; **Stripe** Checkout; **Resend** email.
- **Modules** (`src/modules/<name>/`) each have `controller` → `validator` (zod) → `service` → `repository` layers. Route files and server actions in `src/app` are one-line adapters; the same controllers back `/api/v1` for a future mobile app.
- **One renderer** turns a design (scene JSON in mm) into SVG with text as vector outlines. The browser editor, the proof and the print files all use it, so what's approved is what's printed (D-047).
- **Order lifecycle**: `quote` (basket) → pay → `order` → `artwork` → `proof` (v1…) → approval → `production` (print files generated) → `completed`. Transitions are guarded and logged; production requires every proof approved.

```
src/
├── app/          routes, layouts, server-action adapters, API routes
├── modules/      auth · accounts · catalogue · pricing · designer · cart · orders · payments
│                 proofs · print-files · invoices · accounting · notifications · reports · users
├── components/   shared UI (layout, orders, admin, ui)
├── constants/    one file per concern: limits, site-config, pipeline, roles, storage, routes …
├── config/       env.server.ts / env.public.ts — the only places env vars are read (zod-validated)
├── lib/          Supabase clients, errors, money, file sniffing, Stripe
└── types/        typings for untyped dependencies
supabase/         migrations, seed data, CLI config
tests/            unit (Vitest), integration (live RLS & pipeline), e2e + accessibility (Playwright)
docs/             schema
```

## Run it locally

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run db:push              # migrations + catalogue + templates seed
npm run db:types             # regenerate database types
npm run db:seed-users        # create/reset the test accounts
npm run dev                  # http://localhost:3000
```

`npm run db:reset-demo` shows what test activity exists for the demo customer (orders, designs, uploads and their files, e2e-created divisions); add `-- --confirm` to delete it. Catalogue, templates, gallery and accounts are never touched.

| Variable | Where it's used |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute links (Stripe return, emails, sitemap) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server Supabase clients |
| `SUPABASE_SECRET_KEY` | Server-only privileged writes (after authorisation) |
| `SUPABASE_DB_URL` | Only for `db:push` / `db:types` (session pooler URI) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout and webhook signature verification |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `CRON_SECRET` | Authorises the print-queue worker endpoint |
| `FEATURE_XERO_API` | Switches on the (stub) direct Xero integration |

Supabase settings: **Auth → Sign In / Providers → Email**: provider on, *Confirm email* off (D-033); **URL Configuration**: Site URL and redirect `<site>/**`.
Stripe (test mode): webhook to `<site>/api/v1/webhooks/stripe` for `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. Payments also complete without it (the success page fulfils idempotently, D-058).

## Testing

| Command | What it covers |
|---|---|
| `npm run check` | ESLint, typecheck, 52 unit tests (pricing, VAT, tiers, configuration rules, text fitting, glyph orientation, print-area geometry, vector PDF boxes, CSV, Xero CSV, emails) |
| `npm run test:integration` | Live tests against Supabase: RLS isolation between customers, role escalation blocked, approval gate, concurrent status updates |
| `npm run test:e2e` | Playwright on desktop and mobile: auth, storefront pricing, designer, CSV merge, uploads, Stripe purchase with proof revision and approval, invoice, reorder, CSV print-file output, admin console, and an axe-core WCAG 2.1 AA audit of every page type |

E2E runs against a running app (`npm run build && npm start`) or any URL via `E2E_BASE_URL=https://makeready-umber.vercel.app`. `E2E_SLOWMO=700` with `--headed` makes a run watchable.

The PRD §16 checklist maps to: signup & login (`auth.spec`), configuration & live pricing and volume discounts (`storefront.spec`, `pricing.test`), print-area constraints (`designer.spec`, `render.test`), proof versioning & approval gate (`checkout.spec`, `pipeline.test`), print-file & CSV merge output (`checkout.spec`, `print-files.test`), reorder (`checkout.spec`), admin pipeline & file download (`admin.spec`), responsive (every e2e runs on a phone profile), error handling & edge cases (invalid sizes, fake PDFs, overlong CSV rows, wrong passwords, access control, duplicate payments).

## Deployment

- **Vercel** (new account) builds `main` on every push; environment variables are set in the Vercel project, never committed.
- **Supabase** (new project): `npm run db:push` applies migrations; RLS on every table.
- **GitHub Actions** runs lint, typecheck, unit tests and a production build. It needs three repository *variables* (public values only): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Print queue**: started automatically after approval; a daily Vercel cron is the safety net.

## Known limitations

- **Email delivery**: Resend is in sandbox (no verified domain), so mail only reaches the Resend account owner; sends are logged and never block an order (D-034). Verify a domain and change `EMAIL_FROM` to go live.
- **Colour**: print files are RGB; CMYK conversion would need ICC tooling (D-009).
- **Large PNGs** are capped at 8,000 px on the long edge; the vector PDF is the primary print file (D-063).
- **Uploaded PDFs** are passed through as the print file; they aren't rasterised for PNG output.
- **Content-Security-Policy** isn't set yet because the designer uses inline SVG; other security headers are (D-072).
- **Direct Xero API** is a stub behind `FEATURE_XERO_API`; the CSV export is live (D-071).
- **Delivery** is UK-only (D-056).
