-- Exact volume-discount amount per line (pence), captured at pricing time so order totals never re-derive it.
alter table public.order_items add column discount_minor int not null default 0 check (discount_minor >= 0);
