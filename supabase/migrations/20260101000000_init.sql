-- FormIT initial schema: forms, immutable version history, responses, RLS.

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

create table public.forms (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users on delete cascade,
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  title          text not null check (char_length(title) between 1 and 200),
  schema         jsonb not null,
  schema_version int  not null default 1,
  -- requireSignIn, oneResponsePerUser, maxResponses, confirmationMessage
  settings       jsonb not null default '{}'::jsonb,
  status         text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  opens_at       timestamptz,
  closes_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (opens_at is null or closes_at is null or opens_at < closes_at)
);
create index forms_owner_idx on public.forms (owner_id, updated_at desc);

-- Every schema a response may have been submitted against. Append-only for clients.
create table public.form_versions (
  form_id    uuid not null references public.forms on delete cascade,
  version    int  not null,
  schema     jsonb not null,
  created_at timestamptz not null default now(),
  primary key (form_id, version)
);

create table public.responses (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references public.forms on delete cascade,
  respondent_id  uuid references auth.users on delete set null, -- null = anonymous
  schema_version int  not null,
  answers        jsonb not null,                                 -- { [fieldId]: value }
  -- Set by the submit function to the respondent id ONLY when the form has
  -- oneResponsePerUser enabled. The partial unique index below then makes the rule
  -- race-free without blocking forms that allow repeat submissions.
  dedupe_key     text,
  submitted_at   timestamptz not null default now(),
  foreign key (form_id, schema_version) references public.form_versions (form_id, version)
);
create index responses_form_submitted_idx on public.responses (form_id, submitted_at desc);
create unique index responses_dedupe_idx on public.responses (form_id, dedupe_key)
  where dedupe_key is not null;

/* ------------------------------------------------------------------ */
/* Versioning triggers                                                 */
/* ------------------------------------------------------------------ */

-- Clients never set schema_version. It bumps only when the schema changes AFTER the first
-- response exists; before that, edits overwrite the current version in place.
create function public.forms_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.schema_version := 1;
    return new;
  end if;

  new.updated_at := now();
  new.owner_id   := old.owner_id;

  if new.schema is distinct from old.schema then
    if exists (select 1 from public.responses r where r.form_id = old.id) then
      new.schema_version := old.schema_version + 1;
      insert into public.form_versions (form_id, version, schema)
      values (new.id, new.schema_version, new.schema);
    else
      new.schema_version := old.schema_version;
      update public.form_versions
         set schema = new.schema
       where form_id = old.id and version = old.schema_version;
    end if;
  else
    new.schema_version := old.schema_version;
  end if;
  return new;
end $$;

create trigger forms_before_write
  before insert or update on public.forms
  for each row execute function public.forms_before_write();

create function public.forms_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.form_versions (form_id, version, schema)
  values (new.id, new.schema_version, new.schema);
  return new;
end $$;

create trigger forms_after_insert
  after insert on public.forms
  for each row execute function public.forms_after_insert();

/* ------------------------------------------------------------------ */
/* Row Level Security                                                  */
/* ------------------------------------------------------------------ */

alter table public.forms         enable row level security;
alter table public.form_versions enable row level security;
alter table public.responses     enable row level security;

-- forms: owners only. Public access goes through get_public_form() below.
create policy forms_owner_select on public.forms for select to authenticated
  using (owner_id = (select auth.uid()));
create policy forms_owner_insert on public.forms for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy forms_owner_update on public.forms for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy forms_owner_delete on public.forms for delete to authenticated
  using (owner_id = (select auth.uid()));

-- form_versions: owners can read. Writes happen only via the security-definer triggers.
create policy form_versions_owner_select on public.form_versions for select to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = form_versions.form_id and f.owner_id = (select auth.uid())
  ));

-- responses: owners can read and delete. There is deliberately NO insert policy:
-- submissions go through the submit-response Edge Function (service role), which
-- enforces status, schedule, caps, dedupe, and re-validates the payload.
create policy responses_owner_select on public.responses for select to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = responses.form_id and f.owner_id = (select auth.uid())
  ));
create policy responses_owner_delete on public.responses for delete to authenticated
  using (exists (
    select 1 from public.forms f
    where f.id = responses.form_id and f.owner_id = (select auth.uid())
  ));

/* ------------------------------------------------------------------ */
/* Public read path                                                    */
/* ------------------------------------------------------------------ */

-- Returns only what a respondent needs, and only while the form is open and in schedule.
-- Never exposes owner_id or the full settings object.
create function public.get_public_form(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',                   f.id,
    'slug',                 f.slug,
    'title',                f.title,
    'schema',               f.schema,
    'schema_version',       f.schema_version,
    'require_sign_in',      coalesce((f.settings ->> 'requireSignIn')::boolean, false),
    'confirmation_message', f.settings ->> 'confirmationMessage'
  )
  from public.forms f
  where f.slug = p_slug
    and f.status = 'open'
    and (f.opens_at  is null or f.opens_at  <= now())
    and (f.closes_at is null or f.closes_at >  now());
$$;

revoke all on function public.get_public_form(text) from public;
grant execute on function public.get_public_form(text) to anon, authenticated;
