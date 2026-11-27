-- Core schema for the Digital Heroes web-to-print platform.
-- Money: integer minor units (pence). Geometry: millimetres. See decisions.md D-022.

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('quote', 'order', 'artwork', 'proof', 'production', 'completed', 'cancelled');
create type public.proof_status as enum ('pending', 'approved', 'changes_requested', 'superseded');
create type public.proof_event_type as enum ('issued', 'approved', 'changes_requested', 'reorder_reused');
create type public.print_job_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.pricing_strategy as enum ('area', 'per_unit', 'per_character');
create type public.artwork_source as enum ('designer', 'upload');
create type public.upload_kind as enum ('artwork', 'logo', 'csv');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.delivery_method as enum ('delivery', 'collection');
create type public.print_file_kind as enum ('print_pdf', 'print_png', 'merged_pdf', 'row_pdf', 'bundle_zip');

-- ─── Shared helpers ─────────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Accounts ───────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  company_name text,
  vat_number text,
  role public.user_role not null default 'customer',
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every order/design belongs to an organization so corporate multi-account ordering needs no migration (D-016).
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_number text,
  is_personal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

-- ─── Catalogue ──────────────────────────────────────────────────────────────
create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_groups (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions (id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (division_id, slug)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  -- Multiplier on the base unit price, in basis points (10000 = ×1.00).
  price_factor_bps int not null default 10000 check (price_factor_bps > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One parameter-driven product models every size/material/orientation (PRD §04) — never one row per size.
create table public.products (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions (id) on delete restrict,
  slug text not null,
  name text not null,
  summary text not null default '',
  description text not null default '',
  -- Short code used in production file names: OrderID_ProductType_Date_Output.
  product_type text not null check (product_type ~ '^[A-Za-z0-9]+$'),
  -- Size ranges/presets, orientations and quantity bounds; validated by the catalogue validator.
  parameters jsonb not null,
  bleed_mm numeric(5, 2) not null default 3 check (bleed_mm >= 0),
  safe_margin_mm numeric(5, 2) not null default 3 check (safe_margin_mm >= 0),
  dpi int not null default 300 check (dpi between 72 and 1200),
  supports_designer boolean not null default true,
  supports_upload boolean not null default true,
  supports_variable_data boolean not null default false,
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, slug)
);
create index products_division_idx on public.products (division_id);

create table public.product_materials (
  product_id uuid not null references public.products (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  is_default boolean not null default false,
  primary key (product_id, material_id)
);

create table public.pricing_rules (
  product_id uuid primary key references public.products (id) on delete cascade,
  strategy public.pricing_strategy not null,
  setup_fee_minor int not null default 0 check (setup_fee_minor >= 0),
  unit_base_minor int not null default 0 check (unit_base_minor >= 0),
  area_rate_minor_per_cm2 numeric(10, 4) not null default 0 check (area_rate_minor_per_cm2 >= 0),
  per_character_minor int not null default 0 check (per_character_minor >= 0),
  min_unit_minor int not null default 0 check (min_unit_minor >= 0),
  updated_at timestamptz not null default now()
);

-- product_id null = default tiers for every product without its own.
create table public.volume_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  min_quantity int not null check (min_quantity > 1),
  discount_bps int not null check (discount_bps between 1 and 9000)
);
create unique index volume_tiers_product_qty_idx on public.volume_tiers (product_id, min_quantity) where product_id is not null;
create unique index volume_tiers_default_qty_idx on public.volume_tiers (min_quantity) where product_id is null;

-- Single-row table (D-006); defaults mirror constants/site-config.ts.
create table public.tax_settings (
  id boolean primary key default true check (id),
  label text not null default 'VAT',
  rate_bps int not null default 2000 check (rate_bps between 0 and 10000),
  prices_include_tax boolean not null default true,
  currency char(3) not null default 'GBP',
  xero_tax_type text not null default 'OUTPUT2',
  updated_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  template_group_id uuid references public.template_groups (id) on delete set null,
  name text not null,
  -- Scene JSON: canvas, print areas and elements, including per-placeholder fitting rules.
  scene jsonb not null,
  thumbnail_path text,
  is_default boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_product_idx on public.templates (product_id);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions (id) on delete cascade,
  title text not null,
  description text not null default '',
  image_path text not null,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index gallery_items_division_idx on public.gallery_items (division_id);

-- ─── Designs & uploads ──────────────────────────────────────────────────────
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  kind public.upload_kind not null,
  bucket text not null,
  path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  width_px int,
  height_px int,
  -- `.ai` files without a PDF-compatible layer need a human check (D-008).
  needs_preflight boolean not null default false,
  created_at timestamptz not null default now()
);
create index uploads_org_idx on public.uploads (organization_id);

create table public.csv_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  upload_id uuid not null references public.uploads (id) on delete cascade,
  columns text[] not null,
  row_count int not null check (row_count > 0),
  -- Placeholder id → CSV column name.
  mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  product_id uuid not null references public.products (id) on delete restrict,
  template_id uuid references public.templates (id) on delete set null,
  name text not null default 'Untitled design',
  -- Size, material, orientation and quantity chosen in the configurator.
  configuration jsonb not null,
  source public.artwork_source not null default 'designer',
  current_version int not null default 0,
  is_saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index designs_org_idx on public.designs (organization_id);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs (id) on delete cascade,
  version int not null check (version > 0),
  scene jsonb,
  upload_id uuid references public.uploads (id) on delete set null,
  csv_dataset_id uuid references public.csv_datasets (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (design_id, version),
  check (scene is not null or upload_id is not null)
);

-- ─── Orders ─────────────────────────────────────────────────────────────────
create sequence public.order_number_seq start 1001;
create sequence public.invoice_number_seq start 1001;

-- An order in status `quote` is the customer's cart/saved quote (D-004).
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('DH-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'quote',
  currency char(3) not null default 'GBP',
  items_total_minor int not null default 0,
  discount_total_minor int not null default 0,
  delivery_minor int not null default 0,
  tax_minor int not null default 0,
  total_minor int not null default 0,
  delivery_method public.delivery_method not null default 'delivery',
  shipping_address jsonb,
  reorder_of uuid references public.orders (id) on delete set null,
  -- True once an approved proof has unlocked production files (approval gate, PRD §08).
  files_ready boolean not null default false,
  placed_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_minor >= 0)
);
create index orders_status_idx on public.orders (status);
create index orders_org_idx on public.orders (organization_id);
create index orders_customer_idx on public.orders (customer_id);
create index orders_placed_at_idx on public.orders (placed_at desc);
create unique index orders_one_open_quote_idx on public.orders (customer_id) where status = 'quote';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  design_id uuid references public.designs (id) on delete set null,
  design_version int,
  csv_dataset_id uuid references public.csv_datasets (id) on delete set null,
  -- Snapshots so invoices and history survive catalogue edits.
  product_name text not null,
  product_type text not null,
  configuration jsonb not null,
  quantity int not null check (quantity > 0),
  unit_price_minor int not null check (unit_price_minor >= 0),
  discount_bps int not null default 0,
  setup_fee_minor int not null default 0,
  line_total_minor int not null check (line_total_minor >= 0),
  tax_minor int not null default 0,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null default 'stripe',
  provider_session_id text not null unique,
  provider_payment_intent text,
  amount_minor int not null,
  currency char(3) not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- ─── Proofs ─────────────────────────────────────────────────────────────────
create table public.proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  version int not null check (version > 0),
  status public.proof_status not null default 'pending',
  design_version int,
  preview_path text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (order_item_id, version)
);
create index proofs_order_idx on public.proofs (order_id);

create table public.proof_events (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null references public.proofs (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  event public.proof_event_type not null,
  actor_id uuid references public.profiles (id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);
create index proof_events_order_idx on public.proof_events (order_id, created_at);

-- ─── Production ─────────────────────────────────────────────────────────────
create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  status public.print_job_status not null default 'queued',
  attempts int not null default 0,
  progress_done int not null default 0,
  progress_total int not null default 0,
  error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index print_jobs_status_idx on public.print_jobs (status, created_at);

create table public.print_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  print_job_id uuid references public.print_jobs (id) on delete set null,
  kind public.print_file_kind not null,
  path text not null unique,
  row_index int,
  size_bytes int,
  created_at timestamptz not null default now()
);
create index print_files_order_idx on public.print_files (order_id);

-- ─── Accounting (Xero-ready, D-018) ─────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  invoice_number text not null unique default ('DH-INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  contact_name text not null,
  contact_email text not null,
  issued_on date not null default current_date,
  due_on date not null default current_date,
  currency char(3) not null,
  line_amount_type text not null default 'Inclusive',
  net_minor int not null,
  tax_minor int not null,
  total_minor int not null,
  pdf_path text,
  exported_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity int not null,
  unit_amount_minor int not null,
  account_code text not null,
  tax_type text not null,
  line_amount_minor int not null,
  tax_minor int not null,
  sort_order int not null default 0
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'divisions', 'products', 'templates',
    'designs', 'orders', 'payments', 'print_jobs'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ─── New user bootstrap ─────────────────────────────────────────────────────
-- Role is always `customer` here; it is never read from user-supplied metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_id uuid;
  display_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name);

  insert into public.organizations (name, is_personal)
  values (coalesce(display_name, new.email), true)
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
