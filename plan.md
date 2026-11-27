# Makeready (by Digital Heroes) — Web-to-Print Platform · Execution Plan

Source: `Digital_Heroes_PRD_level 2.pdf` (v1.0, March 2026). Every decision taken while building is logged in [`decisions.md`](./decisions.md).

---

## 1. Status

| Item | State |
|---|---|
| Supabase project (new) | ✅ Created |
| Stripe account | ✅ Created — gateway confirmed (D-011) |
| Resend account | ✅ Created — email provider confirmed (D-012) |
| Vercel account (new) | ✅ Created |
| Tax / currency | ✅ GBP, 20% VAT, VAT-inclusive display, configurable (D-006) |
| Delivery charges | ✅ Flat fee + free-delivery threshold, shown before checkout (D-013) |
| Submission deadline | ASAP — phases run back-to-back |

---

## 2. Code conventions (apply to every line of code)

### 2.1 Comments
- Comment the **why**, not the what. Use them for business rules, non-obvious maths (pricing, fitting, bleed), workarounds and security-relevant checks.
- One short line is the norm. JSDoc only on exported service functions whose behaviour is not obvious from the name and types.
- No commented-out code, no change-log comments, no comments restating the code.

### 2.2 Modular, layered structure
Each feature is a self-contained module with four layers. Dependencies only point downward:

```
controller  →  validator  →  service  →  repository  →  Supabase
```

| Layer | File | Responsibility | Must NOT |
|---|---|---|---|
| Controller | `<module>.controller.ts` | Entry point for route handlers & server actions: resolve auth/role, call validator, call service, map results/errors to responses | Contain business logic or query the DB |
| Validator | `<module>.validator.ts` | zod schemas + inferred types; shared by client forms and server | Have side effects |
| Service | `<module>.service.ts` | Business logic (pricing, proof rules, pipeline transitions, approval gate) | Know about HTTP, cookies or Next.js |
| Repository | `<module>.repository.ts` | All data access (Supabase tables & storage), snake_case ↔ camelCase mapping | Contain business rules |

`app/` route files stay thin — one-line adapters into controllers. The same controllers back `/api/v1/*`, so a future mobile app reuses everything (PRD §14).

```
src/
├── app/                          # Next.js routes only (pages, layouts, route handlers)
│   ├── (storefront)/             # public: hub, division, product, gallery, calculator
│   ├── (auth)/                   # login, signup, reset
│   ├── account/                  # customer dashboard
│   ├── admin/                    # production console
│   └── api/v1/                   # REST endpoints → controllers
│       └── webhooks/stripe/
├── modules/
│   ├── auth/
│   ├── accounts/                 # profiles, organizations
│   ├── catalogue/                # divisions, products, parameters, templates
│   ├── pricing/
│   ├── designer/                 # scene model, print-area constraints, uploads
│   ├── variable-data/            # CSV datasets & mapping
│   ├── cart/                     # QUOTE stage
│   ├── orders/                   # orders, pipeline, archive
│   ├── payments/                 # Stripe checkout + webhook
│   ├── proofs/                   # versions, approvals, change requests
│   ├── print-files/              # render engine, job queue, outputs
│   ├── invoices/
│   ├── accounting/               # Xero-ready export + provider interface
│   ├── notifications/            # Resend emails
│   ├── gallery/
│   ├── reports/
│   └── users/                    # admin user management
│       ├── users.controller.ts
│       ├── users.validator.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── users.types.ts
│       └── components/           # UI that belongs only to this module
├── components/ui/                # shared presentational components
├── constants/                    # one file per concern (see 2.3)
├── config/                       # env.server.ts (server-only) & env.public.ts — the only places env vars are read

├── lib/                          # supabase clients, errors, logger, money, units
└── styles/
supabase/
├── migrations/
└── seed.sql
tests/
├── unit/
└── e2e/
docs/
└── schema.md
```

Module layout rule: a module's files are always named `<module>.<layer>.ts`. A module may import another module's **service** only — never its repository.

### 2.3 Constants — one file per concern, no magic values in code

| File | Holds |
|---|---|
| `constants/limits.ts` | Upload sizes, CSV row cap, max design elements, font-size bounds, pagination sizes, signed-URL TTL |
| `constants/site-config.ts` | Site name, URLs, contact, currency, tax label/rate/inclusive flag, delivery settings |
| `constants/pipeline.ts` | Order statuses, allowed transitions, labels |
| `constants/roles.ts` | Roles and permission map |
| `constants/storage.ts` | Bucket names, path patterns, `OrderID_ProductType_Date_Output` builder |
| `constants/file-types.ts` | Accepted MIME types/extensions per upload kind |
| `constants/routes.ts` | App and API route paths |
| `constants/email.ts` | Sender, subjects, template keys |
| `constants/print.ts` | Default bleed, safe margin, DPI, units |

Secrets and environment-specific values never go in constants — only in `.env.local` (never committed), read through `config/env.server.ts` (secrets, guarded by `server-only`) or `config/env.public.ts` (`NEXT_PUBLIC_*`). Both validate with zod on first use.

### 2.4 Naming & types
- Files kebab-case; React components PascalCase; functions/variables camelCase; DB snake_case.
- TypeScript `strict`. No `any` without a one-line justification.
- Money is always an integer in minor units (paise/pence). Physical dimensions are always millimetres.

### 2.5 Git
- Conventional commit messages (`feat:`, `fix:`, `chore:` …).
- **No AI co-author or "generated with" lines in commits or PR descriptions.**
- `.env*` (except `.env.example`) is git-ignored from the first commit.

---

## 3. Tax — what the PRD says and what it leaves open

**What the PRD states (§05 and §13–14):**
- *Tax:* "VAT-inclusive totals shown at a glance; final price confirmed at checkout with no surprises."
- *Accounting-ready:* "Order records structured for clean export to accounting (Xero-ready data shape)."
- *Scalability:* "An accounting-integration path (full Xero API) ready to switch on later."

**What that means in practice:**
1. Prices the customer sees (calculator, product page, cart) **already include tax**, with the tax portion shown separately.
2. The checkout total must equal what the calculator showed — no tax (or anything else) added late.
3. Each order/invoice line stores net, tax and gross so it can be exported to Xero (Xero supports `LineAmountTypes = Inclusive`).

**What it does not say:** country, currency, tax rate, whether rates differ by product, B2B VAT numbers, or delivery charges. "VAT" + "Xero" read like a UK (or AU/NZ) print house, while the company domain is `.co.in` (India uses GST, not VAT).

**Decision (D-006):** GBP with 20% VAT, prices shown VAT-inclusive, all of it configurable.

**Implementation regardless of the final choice:**
- Tax label, rate, inclusive flag and currency live in `constants/site-config.ts` (defaults) and a `tax_settings` table (admin-editable), with an optional per-product tax class.
- Order of calculation: unit price → volume discount → line gross (tax-inclusive) → tax extracted as `gross × rate / (1 + rate)`, rounded per line in minor units.
- The same `price()` function runs on the client (instant display) and the server (authoritative at quote and checkout).
- Stripe receives tax-inclusive line amounts; tax is computed in-app, not by Stripe Tax.
- Optional VAT/GST number on the customer/organization, printed on invoices.

---

## 4. Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind, Motion.
- **Backend:** Next.js route handlers & server actions via the controller layer; versioned `/api/v1`.
- **Supabase:** Postgres, Auth (cookie sessions via `@supabase/ssr`), Storage (private buckets), RLS on every table.
- **Designer:** react-konva on the client; designs stored in our own scene JSON (not Konva's format).
- **Print files (server):** scene JSON → SVG → PDF (PDFKit + svg-to-pdfkit) and PNG (`@resvg/resvg-js`). A shared `fit()` module using `opentype.js` metrics makes preview and output fit text identically.
- **Payments:** Stripe Checkout (test mode), signature-verified webhook, idempotency keys.
- **Email:** Resend + React Email.
- **Validation / tests:** zod, Vitest, Playwright.

---

## 5. Data model (documented with ERD in `docs/schema.md`)

- **Catalogue:** `divisions` (six; new division = new row), `template_groups`, `products` (jsonb parameter schema: size min/max/step in mm, orientations, quantity bounds; plus bleed mm, safe margin, DPI per product type — D-030), `materials`, `product_materials`, `templates` (scene JSON with print areas, placeholders and their fitting rules — D-030).
- **Pricing:** `pricing_rules` (strategy per product: area-based, per-unit, per-character), `volume_tiers` (e.g. floor at 100), `tax_settings`.
- **Accounts:** `profiles` (role: `customer` | `admin`), `organizations`, `organization_members` (personal org per user now; corporate multi-account later).
- **Designs:** `designs`, `design_versions`, `uploads`, `csv_datasets`.
- **Orders:** `orders` (status enum of the six stages + `cancelled`; status `quote` is the cart — D-030; `archived_at`, `files_ready`), `order_items`, `order_status_history` (drives emails), `payments`.
- **Proofs:** `proofs` (v1, v2…, status, file), `proof_events` (approve / request changes: who, version, when, comment).
- **Production:** `print_jobs` (queue: progress, errors, retries), `print_files` (path `orders/{OrderID}/{OrderID}_{ProductType}_{YYYYMMDD}_{Output}.pdf|png|zip`).
- **Accounting:** `invoices`, `invoice_lines` shaped to Xero fields (ContactName, InvoiceNumber, Reference, Date, DueDate, AccountCode, TaxType, CurrencyCode, LineAmountTypes).
- **Content:** `gallery_items` by product family.

---

## 6. Build phases

### P0 — Foundation ✅ (code done; Vercel/Supabase linking pending keys)
- Repo, `.gitignore` (env files), `.env.example`, `config/env.server.ts` + `config/env.public.ts`.
- Folder structure and constants files from §2.
- New Vercel account; link Supabase project.
- CI: lint, typecheck, unit tests.
- Design tokens: one confident accent on a neutral base, geometric heading face (e.g. Space Grotesk), dense body face (e.g. Inter), motion scale.

### P1 — Auth, roles, schema ✅ (schema live; 9 RLS integration tests passing)
- Migrations for the full data model; RLS policies for visitor / customer / admin.
- Signup, login, logout, password reset, profile & settings.
- Middleware guarding `/account/*` and `/admin/*`, plus role checks in controllers.
- Seed: six divisions, at least one parameter-driven product per division, templates, pricing tiers, test customer & admin.

### P2 — Catalogue & pricing engine ✅ (23 unit + 18 e2e tests passing)
- Home page with a **product hub of equal-weight tiles** as navigation.
- Division and product pages with configurator: size, material, orientation, quantity — parameter-driven, no SKU per size.
- Shared pure `price()`; server recomputes at quote and checkout.
- Automatic volume tiers; tax-inclusive totals with tax line shown.
- Standalone **instant price calculator** usable by visitors.
- **Gallery of real work** filtered by product family.

### P3 — Shared rendering core ✅ (scene → SVG with outlined text; PDF/PNG conversion lands with P7)
- Scene JSON schema, mm unit system, print areas with bleed and safe-zone geometry.
- `fit()`: shrink-to-fit, horizontal tracking, min/max font size; returns an error when content cannot fit at minimum.
- One renderer → SVG → PDF/PNG, snapshot-tested.

### P4 — Web-to-print designer ✅ (38 unit + 26 e2e tests passing)
- Template-driven editing: add/edit text, fonts, sizes, colours, logo upload (PNG/SVG), move/resize/rotate.
- **Print-area lock:** movement clamped (rotated bounding box included); bleed/safe guides; server rejects out-of-bounds scenes.
- **Real-time proof preview** on a product mockup.
- **Upload path:** PDF, SVG, AI, PNG with type/size/DPI checks and a preview (D-008).
- **CSV variable data** (race numbers, bulk): upload → map columns to placeholders → preview rows → validate every row against fitting rules → quantity = row count.
- Save / autosave design to the account.

### P5 — Cart, checkout, order capture ✅ (Stripe test payments verified locally and on Vercel)
- Cart (QUOTE) → Stripe Checkout → webhook writes payment and full order data to the customer account → ORDER → ARTWORK.
- No subscription or recurring billing anywhere.
- Invoice/receipt PDF; confirmation email.

### P6 — Proofs & version control ✅ (approval gate covered by integration + e2e tests)
- Server generates proof v1 → PROOF.
- Customer **approves** or **requests changes** (with comment); revision via re-edit or admin-uploaded proof → v2, v3…
- Approval log: user, version, timestamp.
- **Approval gate** enforced in DB and service layer: production files generate/unlock only after approval.
- Emails: proof ready, changes requested, approved.

### P7 — Print-file engine (server-side)
- Approval enqueues a `print_job`; worker runs in batches (`waitUntil` + cron retry for stuck jobs).
- Per order: hi-res PDF + PNG with product-specific bleed and DPI.
- CSV merge: one file per row, plus combined multi-page PDF and ZIP.
- Files named `OrderID_ProductType_Date_Output` in per-order folders, private bucket.

### P8 — Customer dashboard
All six §10 modules: account & profile status · order history with current status · saved designs with configuration · active proofs and version state · one-click reorder · downloadable invoices/receipts. Customers never see production files or other customers' data (RLS-tested).

### P9 — Admin / production console
- Pipeline board (QUOTE → ORDER → ARTWORK → PROOF → PRODUCTION → COMPLETED) + list view.
- Searchable job database: filter by status, customer, date, product type.
- Ready-for-production indicator per order.
- Download production files: PDF, PNG, per-row CSV artwork, whole-order ZIP.
- Advance jobs through the pipeline; each change logged and emailed.
- User management: list, change role, disable, view a user's orders.
- Product & template management: divisions, products, parameters, materials, print specs, pricing tiers, templates (print areas, placeholder rules), gallery items.
- Reports: order count, revenue, product-family throughput over a date range.
- Archive: completed jobs retained and searchable for repeat and event orders.
- Xero-ready CSV export + `AccountingProvider` interface (CSV now, `XeroApiProvider` stub behind a feature flag).

### P10 — UI/UX polish, performance, responsiveness
- Mobile-first, checked at 360 / 768 / 1280+.
- Subtle transitions and micro-interactions (price changes, hub tiles, pipeline board).
- Distinctive "boutique industrial" look — not a templated print store.
- `next/image`, server components by default, designer lazy-loaded, font subsetting; Lighthouse mobile ≥ 90 target.
- Accessibility basics; error, empty and loading states everywhere.

### P11 — Testing, deployment, handover
- Vitest: pricing, volume tiers, tax, `fit()`, file naming, role permissions.
- Playwright: all 10 §16 checklist items.
- Edge cases: tier boundaries; invalid/oversized uploads; malformed/empty/overflowing CSV rows; duplicate webhooks; failed payments; download before approval; access to another customer's order; failed print job retry.
- Deploy on the new Vercel account with env vars configured.
- README (setup, live URL, customer & admin test credentials), `docs/schema.md`, `decisions.md`.

---

## 7. Coverage matrix — every PRD requirement → phase

| § | Requirement | Phase |
|---|---|---|
| 01 | Browse six ranges + live examples · configure + instant price · design or upload, approve proof · pay, track, one-click reorder | P2 · P2 · P4/P6 · P5/P8 |
| 02 | Pricing engine · designer · flexible product logic · print-file output · accounts & reorder · production dashboard · outstanding UI/UX (+ proofs as 8th, D-001) | P2 · P4 · P1/P2 · P7 · P8 · P9 · P10 (P6) |
| 03 | Visitor: view ranges, gallery, calculator, start signup / first order | P2, P1 |
| 03 | Customer: profile & settings, configure/design/order, approve or request changes, history & reorder, save & reuse designs | P1, P2–P5, P6, P8 |
| 03 | Admin: users & orders, pipeline, print-ready downloads, products & templates, reports & analytics | P9 |
| 04 | Six divisions · parameter-driven products · dynamic size/material/orientation/quantity · per-placeholder fitting | P1 · P1/P2 · P2 · P3 |
| 05 | Live pricing · auto volume discounts · tax-inclusive totals, no checkout surprises · Stripe · order capture against account · Xero-ready data · no subscriptions | P2 · P2 · P2/P5 · P5 · P5 · P1/P9 · P5 |
| 06 | Text, fonts, sizes, colours, logos, move/resize/rotate · print-area lock · real-time proof preview · PDF/SVG/AI/PNG upload · saved designs | P4 |
| 07 | Hi-res PDF + PNG with per-product bleed & DPI · server-side CSV merge, one file per row · shrink-to-fit, tracking, min/max font · `OrderID_ProductType_Date_Output` per-order folders · server-side | P7 · P7 · P3 · P7 · P7 |
| 08 | Versions v1, v2… · approval log · change requests · approval gate | P6 |
| 09 | Auth · order history with status & files · saved proofs & designs · one-click reorder | P1 · P8 · P8 · P8 |
| 10 | Six dashboard modules · strict customer/admin separation | P8 · P1 (RLS) |
| 11 | Six stages · search & filters · ready indicator · file download · advance pipeline · reports · archive | P9 |
| 12 | Accent on neutral base · geometric headings, dense body face · tile hub · live calculator · gallery by family · mobile-first, motion, fast | P0/P10 · P2 · P10 |
| 13 | Recommended stack · responsive · fast · secure auth + HTTPS · email notifications · server-side file generation | P0 · P10 · P10 · P1 · P5/P6/P9 · P7 |
| 14 | New divisions/template groups without rework · corporate multi-account ready · mobile-app ready API · Xero API path | P1 · P1 · P0 · P9 |
| 15 | Live URL · customer test credentials · admin credentials · documented DB · clean code · new Vercel · new Supabase · env vars never committed | P11 · P0 |
| 16 | All 10 testing-checklist items · ambiguity log | P11 · `decisions.md` |

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Client preview ≠ server PDF | One renderer and one `fit()` module for both; pinned font files on both sides |
| Vercel time limits on large CSV merges | Batched job queue, progress in admin, row cap (D-010) |
| Gallery needs real print-work photos | Supplied by you, or openly licensed photos / rendered mockups clearly marked |

---

## 9. Open questions

None at the moment.
