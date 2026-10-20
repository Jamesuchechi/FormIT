-- Response drafts for authenticated respondents, owner storage access, and upload cleanup.

/* ------------------------------------------------------------------ */
/* response_drafts: autosaved answers for signed-in respondents       */
/* ------------------------------------------------------------------ */

create table if not exists public.response_drafts (
  form_id        uuid not null references public.forms on delete cascade,
  respondent_id  uuid not null references auth.users on delete cascade,
  schema_version int  not null,
  answers        jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (form_id, respondent_id)
);

alter table public.response_drafts enable row level security;

create policy response_drafts_select on public.response_drafts
  for select to authenticated
  using (respondent_id = (select auth.uid()));

create policy response_drafts_insert on public.response_drafts
  for insert to authenticated
  with check (respondent_id = (select auth.uid()));

create policy response_drafts_update on public.response_drafts
  for update to authenticated
  using (respondent_id = (select auth.uid()))
  with check (respondent_id = (select auth.uid()));

create policy response_drafts_delete on public.response_drafts
  for delete to authenticated
  using (respondent_id = (select auth.uid()));

/* ------------------------------------------------------------------ */
/* Storage: owners can download uploads for their forms                */
/* ------------------------------------------------------------------ */

create policy storage_form_owners_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'form-uploads'
    and exists (
      select 1 from public.forms f
      where f.id = ((storage.foldername(name))[1])::uuid
        and f.owner_id = (select auth.uid())
    )
  );

/* ------------------------------------------------------------------ */
/* Cleanup orphaned uploads                                            */
/* ------------------------------------------------------------------ */

-- Deletes uploads in form-uploads older than 24h that are not linked to any submitted response.
create or replace function public.cleanup_orphaned_uploads() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select id, name from storage.objects
    where bucket_id = 'form-uploads'
      and created_at < now() - interval '24 hours'
      and not exists (
        select 1 from public.responses resp
        where resp.answers::text like ('%' || name || '%')
      )
  loop
    delete from storage.objects where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.cleanup_orphaned_uploads() from public, anon, authenticated;
grant execute on function public.cleanup_orphaned_uploads() to service_role;
