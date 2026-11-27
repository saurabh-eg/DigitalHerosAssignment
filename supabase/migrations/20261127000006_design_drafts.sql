-- Designer working state (D-048): the editable draft lives on the design; versions are immutable snapshots
-- created when the customer saves. Upload and CSV jobs keep their current file references here too.
alter table public.designs
  add column draft_scene jsonb,
  add column upload_id uuid references public.uploads (id) on delete set null,
  add column csv_dataset_id uuid references public.csv_datasets (id) on delete set null;

create index designs_created_by_idx on public.designs (created_by);
