-- Row-level security. PRD §03/§10: customers see only their own organization's data;
-- production files and print jobs are admin-only (D-003).
-- Order/proof/payment writes go through server services using the secret key, so customers get read-only access there.

-- ─── Helper functions ───────────────────────────────────────────────────────
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_disabled
  );
$$;

create function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = (select auth.uid())
  );
$$;

create function public.can_access_order(target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.orders o
    join public.organization_members m on m.organization_id = o.organization_id
    where o.id = target_order and m.user_id = (select auth.uid())
  );
$$;

-- Customers may edit their own profile details but never their role or disabled flag.
create function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_disabled is distinct from old.is_disabled)
     and current_user not in ('service_role', 'postgres', 'supabase_admin')
     and not public.is_admin() then
    raise exception 'Only administrators can change role or account status' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Email is managed by authentication' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─── Enable RLS everywhere ──────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'organization_members',
    'divisions', 'template_groups', 'materials', 'products', 'product_materials',
    'pricing_rules', 'volume_tiers', 'tax_settings', 'templates', 'gallery_items',
    'uploads', 'csv_datasets', 'designs', 'design_versions',
    'orders', 'order_items', 'order_status_history', 'payments',
    'proofs', 'proof_events', 'print_jobs', 'print_files',
    'invoices', 'invoice_lines'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Admins can do everything on every table.
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end;
$$;

-- ─── Accounts ───────────────────────────────────────────────────────────────
create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "member org read" on public.organizations
  for select to authenticated using (public.is_org_member(id));

create policy "own membership read" on public.organization_members
  for select to authenticated using (user_id = (select auth.uid()));

-- ─── Catalogue: public read of active rows ──────────────────────────────────
create policy "public read active" on public.divisions
  for select to anon, authenticated using (is_active);
create policy "public read" on public.template_groups
  for select to anon, authenticated using (true);
create policy "public read active" on public.materials
  for select to anon, authenticated using (is_active);
create policy "public read active" on public.products
  for select to anon, authenticated using (is_active);
create policy "public read" on public.product_materials
  for select to anon, authenticated using (true);
create policy "public read" on public.pricing_rules
  for select to anon, authenticated using (true);
create policy "public read" on public.volume_tiers
  for select to anon, authenticated using (true);
create policy "public read" on public.tax_settings
  for select to anon, authenticated using (true);
create policy "public read active" on public.templates
  for select to anon, authenticated using (is_active);
create policy "public read published" on public.gallery_items
  for select to anon, authenticated using (is_published);

-- ─── Designs & uploads: full control within own organization ────────────────
create policy "member read" on public.uploads
  for select to authenticated using (public.is_org_member(organization_id));
create policy "member insert" on public.uploads
  for insert to authenticated
  with check (public.is_org_member(organization_id) and uploaded_by = (select auth.uid()));
create policy "member delete" on public.uploads
  for delete to authenticated using (public.is_org_member(organization_id));

create policy "member read" on public.csv_datasets
  for select to authenticated using (public.is_org_member(organization_id));
create policy "member insert" on public.csv_datasets
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "member update" on public.csv_datasets
  for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "member read" on public.designs
  for select to authenticated using (public.is_org_member(organization_id));
create policy "member insert" on public.designs
  for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy "member update" on public.designs
  for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "member delete" on public.designs
  for delete to authenticated using (public.is_org_member(organization_id));

-- Versions are immutable once written: read and insert only.
create policy "member read" on public.design_versions
  for select to authenticated using (
    exists (select 1 from public.designs d where d.id = design_id and public.is_org_member(d.organization_id))
  );
create policy "member insert" on public.design_versions
  for insert to authenticated with check (
    exists (select 1 from public.designs d where d.id = design_id and public.is_org_member(d.organization_id))
  );

-- ─── Orders, proofs, invoices: read-only for the owning organization ────────
create policy "member read" on public.orders
  for select to authenticated using (public.is_org_member(organization_id));
create policy "member read" on public.order_items
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.order_status_history
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.payments
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.proofs
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.proof_events
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.invoices
  for select to authenticated using (public.can_access_order(order_id));
create policy "member read" on public.invoice_lines
  for select to authenticated using (
    exists (select 1 from public.invoices i where i.id = invoice_id and public.can_access_order(i.order_id))
  );
-- print_jobs and print_files: no customer policy — admin only.

-- ─── Grants (explicit, independent of project defaults) ─────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.is_admin(), public.is_org_member(uuid), public.can_access_order(uuid)
  to anon, authenticated, service_role;
