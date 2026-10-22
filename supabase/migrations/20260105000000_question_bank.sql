-- Question bank: save and reuse custom field definitions.

create table if not exists public.saved_questions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  category         text not null default 'General',
  field_definition jsonb not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists saved_questions_owner_idx
  on public.saved_questions (owner_id, category);

alter table public.saved_questions enable row level security;

-- RLS policies: Users have full CRUD access to their own saved questions only.
create policy "saved_questions_select_own"
  on public.saved_questions for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "saved_questions_insert_own"
  on public.saved_questions for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "saved_questions_update_own"
  on public.saved_questions for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "saved_questions_delete_own"
  on public.saved_questions for delete
  to authenticated
  using (owner_id = (select auth.uid()));
