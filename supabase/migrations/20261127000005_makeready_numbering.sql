-- D-045: order and invoice numbers use the Makeready prefix (MR-001001, MR-INV-001001).
alter table public.orders
  alter column order_number set default ('MR-' || lpad(nextval('public.order_number_seq')::text, 6, '0'));

alter table public.invoices
  alter column invoice_number set default ('MR-INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'));
