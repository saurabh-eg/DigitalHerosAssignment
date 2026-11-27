-- P9 production console (D-067). Admin-only: neither object is granted to anon or authenticated.

-- One row per order with the customer and product families flattened, so the job database can be
-- searched and filtered in a single query (order number, customer, status, date, product type).
create view public.admin_order_search
with (security_invoker = true) as
select
  o.id,
  o.order_number,
  o.status,
  o.placed_at,
  o.created_at,
  o.completed_at,
  o.archived_at,
  o.total_minor,
  o.currency,
  o.files_ready,
  o.reorder_of,
  o.customer_id,
  p.email as customer_email,
  p.full_name as customer_name,
  p.company_name,
  coalesce(array_agg(distinct i.product_type) filter (where i.product_type is not null), '{}') as product_types,
  coalesce(array_agg(distinct d.slug) filter (where d.slug is not null), '{}') as division_slugs,
  count(i.id)::int as item_count,
  coalesce(sum(i.quantity), 0)::int as units
from public.orders o
join public.profiles p on p.id = o.customer_id
left join public.order_items i on i.order_id = o.id
left join public.products pr on pr.id = i.product_id
left join public.divisions d on d.id = pr.division_id
group by o.id, p.id;

revoke all on public.admin_order_search from public, anon, authenticated;
grant select on public.admin_order_search to service_role;

-- PRD §11 reports: totals for orders, revenue and product-family throughput over a date range.
-- Paid orders only (placed, not cancelled); revenue is VAT-inclusive with VAT reported separately.
create function public.admin_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with paid as (
    select * from public.orders
    where placed_at >= p_from and placed_at < p_to and status <> 'cancelled'
  ),
  lines as (
    select i.*, d.slug as division_slug, d.name as division_name
    from public.order_items i
    join paid on paid.id = i.order_id
    join public.products pr on pr.id = i.product_id
    join public.divisions d on d.id = pr.division_id
  )
  select jsonb_build_object(
    'orders', (select count(*) from paid),
    'revenue_minor', (select coalesce(sum(total_minor), 0) from paid),
    'tax_minor', (select coalesce(sum(tax_minor), 0) from paid),
    'delivery_minor', (select coalesce(sum(delivery_minor), 0) from paid),
    'units', (select coalesce(sum(quantity), 0) from lines),
    'reorders', (select count(*) from paid where reorder_of is not null),
    'by_division', coalesce((
      select jsonb_agg(row_to_json(x) order by x.revenue_minor desc) from (
        select division_slug as slug, division_name as name, count(distinct order_id) as orders,
               sum(quantity) as units, sum(line_total_minor) as revenue_minor
        from lines group by division_slug, division_name
      ) x), '[]'::jsonb),
    'by_status', coalesce((
      select jsonb_object_agg(status, n) from (select status, count(*) as n from paid group by status) s), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(row_to_json(dd) order by dd.day) from (
        select (placed_at at time zone 'Europe/London')::date as day, count(*) as orders, sum(total_minor) as revenue_minor
        from paid group by 1
      ) dd), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_report(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_report(timestamptz, timestamptz) to service_role;
