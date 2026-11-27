# Decisions Log

Every decision made on this project, including how ambiguities in the PRD were resolved (PRD closing page: "Where it is silent, make a reasonable decision, document it, and be ready to defend it").

**Status:** `Accepted` — in force · `Proposed` — awaiting confirmation · `Superseded` — replaced by a later entry.

New entries are appended with the next ID. Superseded entries stay in place and point to their replacement.

---

## PRD interpretation

### D-001 · The "eighth" core objective
- **Status:** Accepted · 2026-11-27 · PRD §02
- **Context:** The contents page promises "eight outcomes", but §02 lists seven.
- **Decision:** Treat Proof & version control (§08) as the eighth objective.
- **Why:** It has its own section and its own item in the §16 testing checklist.

### D-002 · "Score / configuration of saved designs"
- **Status:** Accepted · 2026-11-27 · PRD §10
- **Context:** "Score" has no meaning for a saved design.
- **Decision:** Read it as "Store". The module lists saved designs with their configuration (product, size, material, quantity).
- **Why:** Most likely a typo; matches §09 "Saved proofs & designs".

### D-003 · Which files a customer can see
- **Status:** Accepted · 2026-11-27 · PRD §09, §10
- **Context:** §09 says order files are accessible to the customer; §10 says the customer never sees production files.
- **Decision:** Customers see their uploaded artwork, proof previews (low-res, watermarked) and invoices. Hi-res bleed files and CSV-merge outputs are admin-only (private bucket + RLS).
- **Why:** Satisfies both statements; production files are internal assets.

### D-004 · Meaning of the QUOTE stage
- **Status:** Accepted · 2026-11-27 · PRD §05, §11
- **Context:** The pipeline starts at QUOTE, but §05 says "no quote forms".
- **Decision:** QUOTE = a configured, priced, unpaid item (cart / saved quote). Payment moves it to ORDER.
- **Why:** Keeps the instant-price promise while giving the first pipeline stage a real meaning.

### D-005 · Order of payment and proof approval
- **Status:** Accepted · 2026-11-27 · PRD §01, §08, §11
- **Decision:** Pay → ORDER → artwork attached → ARTWORK → server generates proof v1 → PROOF → customer approves (files unlock) → PRODUCTION → COMPLETED.
- **Why:** Maps 1:1 to the PRD's six stages; change requests and new versions happen inside PROOF.

### D-006 · Tax and currency
- **Status:** Accepted · 2026-11-27 · PRD §05, §13, §14
- **Context:** The PRD requires "VAT-inclusive totals" and "Xero-ready" data but does not specify country, currency or rate. VAT + Xero suggest a UK print house; the `.co.in` domain suggests India (GST).
- **Options considered:**
  - A — GBP, VAT 20%, single rate. Matches PRD wording and Xero UK tax types.
  - B — INR, GST (rate per product class; intra-/inter-state split CGST+SGST / IGST). More complex, weaker Xero fit.
  - C — Configurable engine with A as default.
- **Decision:** C — configurable engine, defaulting to **GBP and 20% VAT, prices shown VAT-inclusive**. Tax label, rate, inclusive flag and currency are configuration (`constants/site-config.ts` + `tax_settings` table); VAT is extracted from the gross per line (`gross × 0.2 / 1.2`) and rounded in pence; tax is computed in-app, not by Stripe Tax. Xero export uses `LineAmountTypes = Inclusive` and tax type `OUTPUT2` (20% VAT on income).
- **Why:** Follows the PRD's own wording (VAT, Xero) literally; switching to another regime later is a configuration change.

### D-007 · Reorder does not require a new proof
- **Status:** Accepted · 2026-11-27 · PRD §09
- **Decision:** Reorder reuses the approved design version, logs "reorder of order #X, vN" in the approval log, re-prices at current rates, allows quantity edits, and goes to PRODUCTION after payment.
- **Why:** "Re-place a previous order from saved artwork without redesigning."

### D-008 · `.ai` uploads
- **Status:** Accepted · 2026-11-27 · PRD §06
- **Decision:** Render the PDF-compatible layer for preview. Files without one are accepted and flagged "needs manual preflight" for admin.
- **Why:** `.ai` is proprietary; most files saved with PDF compatibility.

### D-009 · Colour space of print files
- **Status:** Accepted · 2026-11-27 · PRD §07
- **Decision:** Vector PDF + PNG in RGB with per-product bleed and DPI. CMYK conversion is a later enhancement.
- **Why:** The PRD specifies bleed and resolution, not colour space; reliable CMYK conversion needs ICC tooling beyond the stack.

### D-010 · CSV merge limits and processing
- **Status:** Accepted · 2026-11-27 · PRD §07, §13
- **Decision:** Merge runs as a background job in batches; uploads capped at 2,000 rows (configurable in `constants/limits.ts`).
- **Why:** Serverless time limits on Vercel; keeps generation server-side as required.

### D-013 · Delivery / shipping charges
- **Status:** Accepted · 2026-11-27 · PRD §05
- **Context:** The PRD never mentions delivery, yet requires "no surprises" at checkout.
- **Decision:** Flat delivery fee with a free-delivery threshold, both in `constants/site-config.ts`, shown in the calculator and product page before checkout. Optional "collect in person" at zero cost. Delivery is VAT-inclusive like everything else.
- **Why:** Keeps the "no surprises" promise with the simplest rule that is easy to change.

---

## Stack & integrations

### D-011 · Payment gateway: Stripe
- **Status:** Accepted · 2026-11-27 · PRD §05
- **Decision:** Stripe Checkout (test mode for submission), signature-verified webhook, idempotency keys. One-off payments only — no subscriptions.

### D-012 · Email provider: Resend
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Decision:** Resend with React Email templates for order updates, proof status and completion alerts.

### D-014 · Core stack
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Decision:** Next.js (App Router) + React + TypeScript + Tailwind; Supabase (Postgres, Auth, Storage, RLS); deployed on a new Vercel account and new Supabase project.
- **Why:** The PRD's recommended stack.

### D-015 · Own design scene format + one shared renderer
- **Status:** Accepted · 2026-11-27 · PRD §06, §07
- **Decision:** Designs are stored as our own scene JSON (mm units). The same `fit()` and SVG renderer feed both the browser preview and server PDF/PNG output.
- **Why:** Guarantees "what is approved matches what is printed" and avoids lock-in to a canvas library.

### D-016 · Organizations from day one
- **Status:** Accepted · 2026-11-27 · PRD §14
- **Decision:** Orders and designs belong to an organization; every user gets a personal one at signup.
- **Why:** Corporate / multi-account ordering later needs no data migration.

### D-017 · Versioned REST API
- **Status:** Accepted · 2026-11-27 · PRD §14
- **Decision:** All features exposed through `/api/v1/*` using the same controllers as the web app.
- **Why:** A future mobile app reuses the backend unchanged.

### D-018 · Accounting integration
- **Status:** Accepted · 2026-11-27 · PRD §05, §14
- **Decision:** Invoice tables mirror Xero invoice fields; a Xero-format CSV export ships now; an `AccountingProvider` interface with a `XeroApiProvider` stub sits behind a feature flag.

---

## Code conventions

### D-019 · Modular layered architecture
- **Status:** Accepted · 2026-11-27
- **Decision:** Each feature is a module in `src/modules/<name>/` with `controller`, `validator`, `service`, `repository` files. Dependencies point downward only; modules talk to each other through services. Details in `plan.md` §2.2.

### D-020 · Centralised constants
- **Status:** Accepted · 2026-11-27
- **Decision:** One file per concern in `src/constants/` (`limits.ts`, `site-config.ts`, `pipeline.ts`, …). No magic values in code. Env vars only via `src/config/env.ts`.

### D-021 · Commenting
- **Status:** Accepted · 2026-11-27
- **Decision:** Short comments only where needed — the "why", business rules, non-obvious maths, security checks. No long or redundant comments.

### D-022 · Money and units
- **Status:** Accepted · 2026-11-27
- **Decision:** Money as integers in minor units; physical dimensions in millimetres.
- **Why:** Avoids floating-point pricing errors and unit confusion in print geometry.

### D-023 · Commit attribution
- **Status:** Accepted · 2026-11-27
- **Decision:** No AI co-author or "generated with" lines in commits or PR descriptions.

---

## Foundation (P0)

### D-024 · A `cancelled` status outside the pipeline
- **Status:** Accepted · 2026-11-27 · PRD §11
- **Context:** The PRD's six stages have no way to stop a job (refund, abandoned order, admin cancel).
- **Decision:** Add `cancelled` as a terminal status that is not one of the six pipeline stages. Allowed transitions live in `constants/pipeline.ts`; only PROOF can move to PRODUCTION, and only via an approval.
- **Why:** Real orders get cancelled; keeping it outside the six stages leaves the PRD pipeline intact.

### D-025 · Visual direction and design tokens
- **Status:** Superseded by D-038 · 2026-11-27 · PRD §12
- **Decision:** Warm cream base, vermilion accent, Space Grotesk / Inter / JetBrains Mono with uppercase mono labels.

### D-038 · Visual direction (revised): press room
- **Status:** Accepted · 2026-11-27 · PRD §12
- **Context:** The first direction (D-025) matched the most common generic "AI-generated" look — cream + vermilion + uppercase mono labels — and the PRD explicitly scores originality and says it must not look templated.
- **Decision:** Drawn from the print trade: cool press-room paper `#eef0f2`, white sheets, rich-black ink `#1a2030`, hairlines `#cdd3db`, and **process magenta** `#c8006a` (a CMYK ink) reserved for calls to action. Jost (geometric, Futura lineage) for headings; IBM Plex Sans with tabular figures for body and dense specs. No all-caps or mono labels. The one bold element is the hero's live **job ticket** framed with printer's crop marks; everything else stays quiet. Motion only responds to the user (price roll-ups), and respects reduced-motion.

---

## Catalogue & pricing (P2)

### D-039 · Pricing formula
- **Status:** Accepted · 2026-11-27 · PRD §05
- **Decision:** `unit = max(round((base + area_cm² × area_rate + characters × per_char) × material_factor), min_unit)`; the volume tier (highest floor reached) discounts the unit price; `line = unit × qty + setup fee`; VAT is extracted per line (`gross × rate / (1 + rate)`). Delivery is order-level (D-013). The same pure `pricing.engine.ts` runs in the browser (instant price) and on the server (`pricing.service.quote`, re-validating the configuration against the catalogue), so a browser-supplied price is never trusted.
- **Why:** Covers every division with one parameter-driven model: area for labels and laser-cut, size-based per-unit for bibs/boards/stamps, plus characters for engraving.

### D-040 · Engraving characters are an estimate until the design exists
- **Status:** Accepted · 2026-11-27 · PRD §05
- **Context:** Trophy plates are priced per engraved character, but the text isn't known in the configurator.
- **Decision:** The configurator asks for an estimated character count (default 40); the order is re-priced from the actual design text at checkout and the customer sees the confirmed price before paying.

### D-041 · Static catalogue pages
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Decision:** Catalogue reads use a cookie-free Supabase client so the hub, division, product, calculator and gallery pages are statically generated with `revalidate = 300` (5 minutes); admin edits will also call `revalidatePath`. Every product is fetched once and passed to the client configurator, so price updates need no network round-trip.

### D-042 · Gallery seeded with illustrated samples
- **Status:** Accepted · 2026-11-27 · PRD §12
- **Context:** The PRD asks for a gallery of real work, and no photographs of real jobs exist yet.
- **Decision:** Eight illustrated sample jobs (SVG, two divisions with two each) are seeded and visibly labelled "Illustrated sample". Admins replace them with real photos through gallery management (P9); photos are served from the public `gallery` bucket.

### D-043 · Mobile price visibility
- **Status:** Accepted · 2026-11-27 · PRD §12
- **Decision:** On screens below `lg`, a sticky bar at the bottom keeps the live total in view while options are changed, since the full price panel sits below the form on phones. A second navigation row appears under the header on mobile.

### D-045 · Product name: Makeready
- **Status:** Accepted · 2026-11-27 · PRD §12
- **Decision:** The platform is named **Makeready**, credited as "Makeready by Digital Heroes". Order and invoice numbers use `MR-` / `MR-INV-` prefixes. The name lives in `SITE_CONFIG.name`; the company in `SITE_CONFIG.company`.
- **Why:** "Makeready" is the printer's term for the setup done before a press run — it describes what the platform does (production-ready output, not just artwork upload) and fits the print-trade visual direction without sounding like a generic print store.

### D-046 · No Vercel ↔ Supabase marketplace integration
- **Status:** Accepted · 2026-11-27 · PRD §15
- **Decision:** Environment variables are added manually in Vercel. The marketplace integration is not used: it provisions its own Supabase project and its own variable names, which would duplicate the existing, already-migrated project.

---

## Designer & rendering (P3–P4)

### D-047 · One renderer for editor, proof and print file
- **Status:** Accepted · 2026-11-27 · PRD §06, §07
- **Decision:** Designs are stored as our own scene JSON in millimetres. A single pure renderer (`designer/render`) turns a scene into SVG, converting text to vector outlines from the bundled font files with opentype.js. The browser editor draws exactly that SVG; the server will turn the same SVG into the PDF/PNG print files (P7). The editor is a custom SVG editor rather than Konva/Fabric.
- **Why:** "What is approved matches what is printed" holds by construction, not by keeping two renderers in sync. Outlined text is also the print-trade norm (no missing fonts at the printer).

### D-048 · Drafts and immutable versions
- **Status:** Accepted · 2026-11-27 · PRD §08, §09
- **Decision:** The working draft lives on `designs.draft_scene` and is autosaved (debounced 1.5 s). "Save design" runs full validation on the server and writes an immutable `design_versions` row (v1, v2…). Orders and proofs will always reference a saved version, never the draft.

### D-049 · Size-independent templates
- **Status:** Accepted · 2026-11-27 · PRD §04, §14
- **Decision:** Template element positions and sizes are fractions of the print area, so one template fits every size of a parameter-driven product; font sizes are derived from box height and fitting rules keep text inside. Adding a template is one row in `templates` — no code change.

### D-050 · Fonts and text layout
- **Status:** Accepted · 2026-11-27 · PRD §06
- **Decision:** Five Open Font Licence families (Inter, Oswald, Roboto Slab, Playfair Display, Archivo Black) ship in `public/fonts` and are traced into the server bundle. Text is laid out glyph by glyph (advance widths, pair kerning, tracking) without OpenType shaping/ligatures.
- **Why:** opentype.js v2's shaping throws on some GSUB lookups in these fonts; plain glyph layout is deterministic and keeps names and race numbers exactly as typed. A regression test guards glyph orientation (v2's `toPathData` flips Y by default).

### D-051 · Uploads go browser → storage, then the server re-checks the bytes
- **Status:** Accepted · 2026-11-27 · PRD §06, §13
- **Decision:** Files upload directly to the customer's own storage folder (RLS-enforced `<org>/<design>/…`), then a server action re-downloads them and decides what they really are by magic bytes, not name or browser type. Rejected files are deleted. Checks: size limits; SVGs with scripts refused; PNG effective DPI at print size (reject < 150, warn < 300); PDF must open (no password) and its page size is compared with trim + bleed; legacy PostScript-based `.ai` files are accepted and flagged for manual preflight (D-008).

### D-052 · How the print-area lock behaves
- **Status:** Accepted · 2026-11-27 · PRD §06
- **Decision:** Every change passes through `constrainToArea`. Moving is clamped at the edge. Text and boxes at right angles clamp only the overflowing side (widening a text box doesn't flatten it); images and freely rotated elements scale uniformly. Resizing is symmetric about the centre; text scales with its box. The server re-checks every element is inside its print area on every save.

### D-053 · Variable data (CSV) rules
- **Status:** Accepted · 2026-11-27 · PRD §07
- **Decision:** Text elements can be linked to a spreadsheet field. A CSV (header row, ≤ 2,000 rows, ≤ 20 columns, ≤ 120 characters per cell) is parsed in the browser for instant feedback and again on the server. Columns are auto-matched to fields by name and can be re-mapped. Quantity follows the row count and must fall within the product's quantity range. Every row is checked against the fitting rules; saving is blocked while any row can't fit, and the failing rows are listed and previewable.

### D-054 · Starting a job is a POST
- **Status:** Accepted · 2026-11-27
- **Decision:** `/design/new` shows the configuration and a template picker; the design row is created only when the customer submits the form. Creating records on a GET would let link prefetching create empty designs.

### D-044 · End-to-end tests with Playwright
- **Status:** Accepted · 2026-11-27 · PRD §16
- **Decision:** Playwright runs against a built app (or `E2E_BASE_URL`, e.g. the Vercel URL) on a desktop and a mobile profile. Current coverage: sign-in/out and redirect-back, wrong password, customer blocked from admin, admin landing, live pricing incl. the 100-unit discount boundary, invalid size handling, calculator, gallery filter.

### D-026 · PRD file kept out of the repository
- **Status:** Accepted · 2026-11-27
- **Decision:** The PRD PDF stays in the project folder for reference but is git-ignored.
- **Why:** It is marked "issued for selection process only".

### D-027 · Environment variable handling
- **Status:** Accepted · 2026-11-27 · PRD §13, §15
- **Decision:** Two modules — `config/env.server.ts` (secrets, `server-only`) and `config/env.public.ts` (`NEXT_PUBLIC_*`, each referenced literally so Next.js can inline them). Both are zod-validated lazily on first use, so builds succeed before every secret exists. Supabase uses the new publishable/secret key pair.
- **Why:** A secret can never be imported into client code, and a missing variable fails loudly with its name.

### D-028 · Next.js 16 defaults kept
- **Status:** Superseded by D-029 · 2026-11-27 · PRD §13
- **Decision:** Keep the scaffold's Turbopack, Cache Components and Partial Prefetching. Route protection will use `proxy.ts` (Next 16's replacement for `middleware.ts`). Typecheck runs `next typegen` first.

### D-029 · Cache Components switched off
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Context:** With Cache Components on, every cookie read must sit inside a Suspense boundary or the build fails. Nearly every customer and admin route reads the Supabase session cookie.
- **Decision:** Turn Cache Components and Partial Prefetching off. Turbopack, `proxy.ts` and `next typegen` stay. Storefront pages remain static because the header's account menu reads the session in the browser; protected routes render dynamically and re-check the user on the server.
- **Why:** Lower risk under the ASAP deadline with no loss for the storefront; can be revisited later.

---

## Data & auth (P1)

### D-030 · Schema simplifications versus the first plan
- **Status:** Accepted · 2026-11-27 · PRD §04, §07, §11
- **Decision:**
  - Bleed, safe margin and DPI are columns on `products` (no separate `print_specs` table) — "defined per product type".
  - Placeholder fitting rules live inside each template's scene JSON, so they version with the template.
  - The cart/quote is an `orders` row with status `quote` (no separate `quotes` table); at most one open quote per customer.
- **Why:** Fewer joins and no duplicated state; the pipeline board shows quotes like any other stage.

### D-031 · Where writes happen
- **Status:** Accepted · 2026-11-27 · PRD §03, §10
- **Decision:** Customers write their own profile, designs, uploads and CSV datasets through RLS-protected queries. Orders, order items, payments, proofs, print jobs and invoices are written only by server services using the secret key, after the service has authorised the actor. Customers have read-only RLS access to their organization's orders, proofs and invoices; print jobs and production files have no customer policies at all.
- **Why:** Prices, statuses and approvals can never be forged from the browser; RLS remains a second line of defence.

### D-032 · Role is never user-controlled
- **Status:** Accepted · 2026-11-27 · PRD §03
- **Decision:** New users are always created as `customer` by a database trigger (metadata is ignored for role). A trigger blocks non-admins from changing `role`, `is_disabled` or `email`. Admin accounts are created by `npm run db:seed-users` or promoted by an existing admin.

### D-033 · Email confirmation off for the assessment build
- **Status:** Accepted · 2026-11-27 · PRD §13, §15
- **Context:** Supabase's built-in mailer is heavily rate-limited, and evaluators need to sign up and test immediately.
- **Decision:** Turn off "Confirm email" in Supabase Auth. The code handles both modes: if confirmation is on, signup shows "check your inbox" and the link completes via `/auth/callback`.

### D-034 · Resend sandbox limitation
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Context:** Without a verified domain, Resend only delivers to the Resend account owner's own address (sender `onboarding@resend.dev`).
- **Decision:** Notification emails are built and sent through Resend; until a domain is verified, delivery is limited to the account owner's inbox. Every email is also recorded in the order's status history, so nothing depends on delivery. Verifying a domain only means changing `EMAIL_FROM`.

### D-035 · Test accounts
- **Status:** Accepted · 2026-11-27 · PRD §15
- **Decision:** `npm run db:seed-users` creates or resets `demo.customer@example.com` and `demo.admin@example.com` (passwords in the README, overridable with `SEED_*` variables).

### D-037 · RLS helper functions live in a private schema
- **Status:** Accepted · 2026-11-27 · PRD §13
- **Context:** The Supabase security advisor flagged `is_admin`, `is_org_member`, `can_access_order` and `handle_new_user` (all `SECURITY DEFINER`) as callable through `/rest/v1/rpc`.
- **Decision:** Moved them to a `private` schema that the Data API does not expose; only `authenticated` may execute the three RLS helpers, and the signup trigger function is not executable by any API role. New policies must call `private.is_admin()` etc. Remaining advisor note — leaked-password protection — needs a paid Supabase plan and is left off.

### D-036 · Server actions as thin adapters
- **Status:** Accepted · 2026-11-27
- **Decision:** `'use server'` files live in `app/` next to the routes that use them and only forward to module controllers. Module UI components receive actions as props, so modules never import from `app/`.
