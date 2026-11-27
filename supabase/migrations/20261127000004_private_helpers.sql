-- Security advisor 0028/0029: SECURITY DEFINER helpers in `public` were callable via /rest/v1/rpc.
-- Move them to a schema the Data API does not expose. Policies reference functions by OID, so they keep working.
create schema if not exists private;

alter function public.is_admin() set schema private;
alter function public.is_org_member(uuid) set schema private;
alter function public.can_access_order(uuid) set schema private;
alter function public.handle_new_user() set schema private;

-- Policies evaluated for signed-in users still need to call the helpers.
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on function private.is_admin(), private.is_org_member(uuid), private.can_access_order(uuid) to authenticated;

-- Trigger-only; nobody should call it directly.
revoke all on function private.handle_new_user() from authenticated, service_role;

-- can_access_order and protect_profile_columns call is_admin by name, so repoint them.
create or replace function private.can_access_order(target_order uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.orders o
    join public.organization_members m on m.organization_id = o.organization_id
    where o.id = target_order and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_disabled is distinct from old.is_disabled)
     and current_user not in ('service_role', 'postgres', 'supabase_admin')
     and not private.is_admin() then
    raise exception 'Only administrators can change role or account status' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Email is managed by authentication' using errcode = '42501';
  end if;
  return new;
end;
$$;
