-- Allow response editing by respondents via edit key / token.

-- 1. Add edit_key column and updated_at to responses
alter table public.responses
  add column if not exists edit_key text unique default encode(gen_random_bytes(24), 'hex'),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists responses_edit_key_idx on public.responses (edit_key);

-- 2. Update get_public_form to include allow_response_editing in response
create or replace function public.get_public_form(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',                     f.id,
    'slug',                   f.slug,
    'title',                  f.title,
    'schema',                 f.schema,
    'schema_version',         f.schema_version,
    'require_sign_in',        coalesce((f.settings ->> 'requireSignIn')::boolean, false),
    'confirmation_message',   f.settings ->> 'confirmationMessage',
    'allow_response_editing', coalesce((f.settings ->> 'allowResponseEditing')::boolean, false)
  )
  from public.forms f
  where f.slug = p_slug
    and f.status = 'open'
    and (f.opens_at  is null or f.opens_at  <= now())
    and (f.closes_at is null or f.closes_at >  now());
$$;

-- 3. submit_response: returns the edit_key
drop function if exists public.submit_response(uuid, int, jsonb, uuid, boolean);
drop function if exists public.submit_response(uuid, integer, jsonb, uuid, boolean);

create or replace function public.submit_response(
  p_form_id        uuid,
  p_schema_version int,
  p_answers        jsonb,
  p_respondent     uuid,
  p_dedupe         boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f          public.forms%rowtype;
  v_count    bigint;
  v_id       uuid;
  v_edit_key text;
begin
  select * into f from public.forms where id = p_form_id for update;
  if not found then
    raise exception 'form_not_found';
  end if;

  if f.status <> 'open'
     or (f.opens_at  is not null and f.opens_at  >  now())
     or (f.closes_at is not null and f.closes_at <= now()) then
    raise exception 'form_closed';
  end if;

  if f.schema_version <> p_schema_version then
    raise exception 'schema_changed';
  end if;

  if jsonb_typeof(f.settings -> 'maxResponses') = 'number' then
    select count(*) into v_count from public.responses where form_id = f.id;
    if v_count >= (f.settings ->> 'maxResponses')::numeric then
      raise exception 'response_limit_reached';
    end if;
  end if;

  v_edit_key := encode(gen_random_bytes(24), 'hex');

  -- Unique violation (23505) on responses_dedupe_idx surfaces as "already_submitted".
  insert into public.responses (form_id, respondent_id, schema_version, answers, dedupe_key, edit_key)
  values (
    f.id,
    p_respondent,
    f.schema_version,
    p_answers,
    case when p_dedupe and p_respondent is not null then p_respondent::text end,
    v_edit_key
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'edit_key', v_edit_key);
end $$;

revoke all on function public.submit_response(uuid, int, jsonb, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.submit_response(uuid, int, jsonb, uuid, boolean)
  to service_role;

-- 4. get_response_for_edit: retrieves response answers and form details using edit_key
create or replace function public.get_response_for_edit(p_edit_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  f record;
begin
  select * into r from public.responses where edit_key = p_edit_key;
  if not found then
    return null;
  end if;

  select * into f from public.forms where id = r.form_id;
  if not found then
    return null;
  end if;

  -- Verify form allows response editing and is not closed
  if coalesce((f.settings ->> 'allowResponseEditing')::boolean, false) is not true then
    raise exception 'editing_disabled';
  end if;

  if f.status <> 'open'
     or (f.opens_at  is not null and f.opens_at  >  now())
     or (f.closes_at is not null and f.closes_at <= now()) then
    raise exception 'form_closed';
  end if;

  return jsonb_build_object(
    'response_id',            r.id,
    'schema_version',         r.schema_version,
    'answers',                r.answers,
    'submitted_at',           r.submitted_at,
    'form', jsonb_build_object(
      'id',                   f.id,
      'slug',                 f.slug,
      'title',                f.title,
      'schema',               f.schema,
      'schema_version',       f.schema_version,
      'require_sign_in',      coalesce((f.settings ->> 'requireSignIn')::boolean, false),
      'confirmation_message', f.settings ->> 'confirmationMessage',
      'allow_response_editing', true
    )
  );
end $$;

revoke all on function public.get_response_for_edit(text) from public;
grant execute on function public.get_response_for_edit(text) to anon, authenticated;

-- 5. update_response_by_key: updates response answers using edit_key
create or replace function public.update_response_by_key(
  p_edit_key       text,
  p_schema_version int,
  p_answers        jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  f record;
begin
  select * into r from public.responses where edit_key = p_edit_key for update;
  if not found then
    raise exception 'response_not_found';
  end if;

  select * into f from public.forms where id = r.form_id for update;
  if not found then
    raise exception 'form_not_found';
  end if;

  if coalesce((f.settings ->> 'allowResponseEditing')::boolean, false) is not true then
    raise exception 'editing_disabled';
  end if;

  if f.status <> 'open'
     or (f.opens_at  is not null and f.opens_at  >  now())
     or (f.closes_at is not null and f.closes_at <= now()) then
    raise exception 'form_closed';
  end if;

  update public.responses
  set answers = p_answers,
      schema_version = p_schema_version,
      updated_at = now()
  where id = r.id;

  return jsonb_build_object('ok', true, 'id', r.id);
end $$;

revoke all on function public.update_response_by_key(text, int, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_response_by_key(text, int, jsonb)
  to service_role;
