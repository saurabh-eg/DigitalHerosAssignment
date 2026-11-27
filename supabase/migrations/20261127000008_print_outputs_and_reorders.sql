-- P7: uploaded files that can't be converted (e.g. legacy .ai) are passed to production unchanged.
alter type public.print_file_kind add value if not exists 'original';

-- P8 one-click reorder (D-007): a reordered line points at the line whose approved artwork it reuses.
alter table public.order_items
  add column reorder_of_item_id uuid references public.order_items (id) on delete set null;
