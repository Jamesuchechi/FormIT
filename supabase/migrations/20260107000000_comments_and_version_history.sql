-- Migration: 20260107000000_comments_and_version_history.sql
-- Field Comments while editing and Version History with Restore.

/* ------------------------------------------------------------------ */
/* 1. Field Comments Table                                            */
/* ------------------------------------------------------------------ */

create table if not exists public.field_comments (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms(id) on delete cascade,
  field_id     text not null,
  author_id    uuid not null references auth.users(id) on delete cascade,
  author_email text not null,
  content      text not null check (char_length(trim(content)) between 1 and 2000),
  status       text not null default 'open' check (status in ('open', 'resolved')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists field_comments_form_field_idx
  on public.field_comments (form_id, field_id, created_at asc);

create index if not exists field_comments_author_idx
  on public.field_comments (author_id);

alter table public.field_comments enable row level security;

-- Comments RLS
create policy field_comments_select on public.field_comments for select to authenticated
  using (public.has_form_access(form_id, 'viewer'));

create policy field_comments_insert on public.field_comments for insert to authenticated
  with check (
    public.has_form_access(form_id, 'editor') and
    author_id = (select auth.uid())
  );

create policy field_comments_update on public.field_comments for update to authenticated
  using (public.has_form_access(form_id, 'editor'))
  with check (public.has_form_access(form_id, 'editor'));

create policy field_comments_delete on public.field_comments for delete to authenticated
  using (
    author_id = (select auth.uid()) or
    public.has_form_access(form_id, 'owner')
  );

/* ------------------------------------------------------------------ */
/* 2. Version History Enhancements                                    */
/* ------------------------------------------------------------------ */

alter table public.form_versions
  add column if not exists label text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Create an explicit version snapshot with optional label
create or replace function public.create_form_version_snapshot(
  p_form_id uuid,
  p_label text default null
)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_current_schema jsonb;
  v_next_version int;
begin
  if not public.has_form_access(p_form_id, 'editor') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select schema into v_current_schema
  from public.forms
  where id = p_form_id;

  if v_current_schema is null then
    raise exception 'form_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.form_versions
  where form_id = p_form_id;

  insert into public.form_versions (form_id, version, schema, label, created_by, created_at)
  values (p_form_id, v_next_version, v_current_schema, p_label, v_user_id, now());

  update public.forms
     set schema_version = v_next_version,
         updated_at = now()
   where id = p_form_id;

  return v_next_version;
end $$;

-- Restore a specific historical version
create or replace function public.restore_form_version(
  p_form_id uuid,
  p_version int
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_target_schema jsonb;
  v_next_version int;
begin
  if not public.has_form_access(p_form_id, 'editor') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select schema into v_target_schema
  from public.form_versions
  where form_id = p_form_id and version = p_version;

  if v_target_schema is null then
    raise exception 'version_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.form_versions
  where form_id = p_form_id;

  -- Create a new version snapshot recording the restore
  insert into public.form_versions (form_id, version, schema, label, created_by, created_at)
  values (
    p_form_id,
    v_next_version,
    v_target_schema,
    'Restored from version ' || p_version,
    v_user_id,
    now()
  );

  update public.forms
     set schema = v_target_schema,
         schema_version = v_next_version,
         updated_at = now()
   where id = p_form_id;

  return v_target_schema;
end $$;
