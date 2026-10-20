-- Atomic response submission + private upload bucket.

/* ------------------------------------------------------------------ */
/* Storage: private bucket, no client policies (service role only)     */
/* ------------------------------------------------------------------ */

insert into storage.buckets (id, name, public, file_size_limit)
values ('form-uploads', 'form-uploads', false, 104857600) -- 100 MB hard ceiling; per-field limits enforced in functions
on conflict (id) do nothing;

/* ------------------------------------------------------------------ */
/* submit_response: the only way a response row is created             */
/* ------------------------------------------------------------------ */

-- Locks the form row so status, schedule, response cap and schema version are checked and
-- the insert happens as one serialized step. This closes the cap race a check-then-insert
-- in application code would have. (Trade-off: submissions to ONE form serialize briefly.)
create function public.submit_response(
  p_form_id        uuid,
  p_schema_version int,
  p_answers        jsonb,
  p_respondent     uuid,
  p_dedupe         boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  f       public.forms%rowtype;
  v_count bigint;
  v_id    uuid;
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

  -- Unique violation (23505) on responses_dedupe_idx surfaces as "already_submitted".
  insert into public.responses (form_id, respondent_id, schema_version, answers, dedupe_key)
  values (
    f.id,
    p_respondent,
    f.schema_version,
    p_answers,
    case when p_dedupe and p_respondent is not null then p_respondent::text end
  )
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.submit_response(uuid, int, jsonb, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.submit_response(uuid, int, jsonb, uuid, boolean)
  to service_role;
