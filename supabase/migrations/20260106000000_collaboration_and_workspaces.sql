-- Migration: 20260106000000_collaboration_and_workspaces.sql
-- Teams / workspaces and Form Collaborators (viewer, editor) with invite flow.

/* ------------------------------------------------------------------ */
/* 1. Workspaces & Workspace Members                                  */
/* ------------------------------------------------------------------ */

create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on public.workspaces(owner_id, updated_at desc);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('owner', 'admin', 'member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- Auto-add workspace creator as owner in workspace_members
create or replace function public.workspaces_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end $$;

drop trigger if exists workspaces_after_insert on public.workspaces;
create trigger workspaces_after_insert
  after insert on public.workspaces
  for each row execute function public.workspaces_after_insert();

/* ------------------------------------------------------------------ */
/* 2. Link Forms to Workspace                                         */
/* ------------------------------------------------------------------ */

alter table public.forms
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

create index if not exists forms_workspace_idx on public.forms(workspace_id, updated_at desc);

/* ------------------------------------------------------------------ */
/* 3. Form Collaborators                                              */
/* ------------------------------------------------------------------ */

create table if not exists public.form_collaborators (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.forms(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('editor', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (form_id, user_id)
);

create index if not exists form_collaborators_user_idx on public.form_collaborators(user_id, form_id);
create index if not exists form_collaborators_form_idx on public.form_collaborators(form_id);

/* ------------------------------------------------------------------ */
/* 4. Collaborator & Workspace Invites                                */
/* ------------------------------------------------------------------ */

create table if not exists public.collaborator_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  target_type text not null check (target_type in ('form', 'workspace')),
  target_id   uuid not null,
  role        text not null check (role in ('editor', 'viewer', 'admin', 'member')),
  invited_by  uuid not null references auth.users(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

create index if not exists collaborator_invites_target_idx on public.collaborator_invites(target_type, target_id, status);
create index if not exists collaborator_invites_token_idx on public.collaborator_invites(token);

/* ------------------------------------------------------------------ */
/* 5. Permission Checker Function                                      */
/* ------------------------------------------------------------------ */

-- Checks if the calling user auth.uid() has at least p_min_role on a form.
-- Role hierarchy: owner > editor > viewer
create or replace function public.has_form_access(p_form_id uuid, p_min_role text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_form record;
  v_collab_role text;
  v_workspace_role text;
begin
  if v_user_id is null then
    return false;
  end if;

  select id, owner_id, workspace_id into v_form
  from public.forms
  where id = p_form_id;

  if not found then
    return false;
  end if;

  -- 1. Direct form owner has top privileges
  if v_form.owner_id = v_user_id then
    return true;
  end if;

  -- 2. Workspace level permissions
  if v_form.workspace_id is not null then
    select role into v_workspace_role
    from public.workspace_members
    where workspace_id = v_form.workspace_id and user_id = v_user_id;

    if v_workspace_role in ('owner', 'admin') then
      return true;
    elsif v_workspace_role = 'member' and p_min_role in ('editor', 'viewer') then
      return true;
    end if;
  end if;

  -- 3. Explicit form collaborator permissions
  select role into v_collab_role
  from public.form_collaborators
  where form_id = p_form_id and user_id = v_user_id;

  if v_collab_role is not null then
    if v_collab_role = 'editor' and p_min_role in ('editor', 'viewer') then
      return true;
    elsif v_collab_role = 'viewer' and p_min_role = 'viewer' then
      return true;
    end if;
  end if;

  return false;
end $$;

-- Return current user's effective role on a form ('owner', 'editor', 'viewer', or null)
create or replace function public.get_user_form_role(p_form_id uuid)
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_form record;
  v_collab_role text;
  v_workspace_role text;
begin
  if v_user_id is null then
    return null;
  end if;

  select id, owner_id, workspace_id into v_form
  from public.forms
  where id = p_form_id;

  if not found then
    return null;
  end if;

  if v_form.owner_id = v_user_id then
    return 'owner';
  end if;

  if v_form.workspace_id is not null then
    select role into v_workspace_role
    from public.workspace_members
    where workspace_id = v_form.workspace_id and user_id = v_user_id;

    if v_workspace_role in ('owner', 'admin') then
      return 'owner';
    elsif v_workspace_role = 'member' then
      return 'editor';
    end if;
  end if;

  select role into v_collab_role
  from public.form_collaborators
  where form_id = p_form_id and user_id = v_user_id;

  if v_collab_role is not null then
    return v_collab_role;
  end if;

  return null;
end $$;

/* ------------------------------------------------------------------ */
/* 6. Updated RLS Policies                                            */
/* ------------------------------------------------------------------ */

-- Drop legacy owner-only policies
drop policy if exists forms_owner_select on public.forms;
drop policy if exists forms_owner_update on public.forms;
drop policy if exists forms_owner_delete on public.forms;

drop policy if exists form_versions_owner_select on public.form_versions;
drop policy if exists responses_owner_select on public.responses;
drop policy if exists responses_owner_delete on public.responses;

-- Forms RLS
create policy forms_select on public.forms for select to authenticated
  using (owner_id = (select auth.uid()) or public.has_form_access(id, 'viewer'));

create policy forms_update on public.forms for update to authenticated
  using (owner_id = (select auth.uid()) or public.has_form_access(id, 'editor'))
  with check (owner_id = (select auth.uid()) or public.has_form_access(id, 'editor'));

create policy forms_delete on public.forms for delete to authenticated
  using (owner_id = (select auth.uid()) or public.has_form_access(id, 'owner'));

-- Form versions RLS
create policy form_versions_select on public.form_versions for select to authenticated
  using (public.has_form_access(form_id, 'viewer'));

-- Responses RLS
create policy responses_select on public.responses for select to authenticated
  using (public.has_form_access(form_id, 'viewer'));

create policy responses_delete on public.responses for delete to authenticated
  using (public.has_form_access(form_id, 'editor'));

-- Workspaces RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.form_collaborators enable row level security;
alter table public.collaborator_invites enable row level security;

create policy workspaces_select on public.workspaces for select to authenticated
  using (
    owner_id = (select auth.uid()) or
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id and wm.user_id = (select auth.uid())
    )
  );

create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy workspaces_update on public.workspaces for update to authenticated
  using (
    owner_id = (select auth.uid()) or
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
    )
  );

create policy workspaces_delete on public.workspaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Workspace members RLS
create policy workspace_members_select on public.workspace_members for select to authenticated
  using (
    user_id = (select auth.uid()) or
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = (select auth.uid())
    )
  );

create policy workspace_members_all on public.workspace_members for all to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
    )
  );

-- Form collaborators RLS
create policy form_collaborators_select on public.form_collaborators for select to authenticated
  using (user_id = (select auth.uid()) or public.has_form_access(form_id, 'viewer'));

create policy form_collaborators_all on public.form_collaborators for all to authenticated
  using (public.has_form_access(form_id, 'owner'));

-- Collaborator invites RLS
create policy collaborator_invites_select on public.collaborator_invites for select to authenticated
  using (
    invited_by = (select auth.uid()) or
    (target_type = 'form' and public.has_form_access(target_id, 'owner')) or
    (target_type = 'workspace' and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = target_id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
    ))
  );

create policy collaborator_invites_insert on public.collaborator_invites for insert to authenticated
  with check (
    (target_type = 'form' and public.has_form_access(target_id, 'owner')) or
    (target_type = 'workspace' and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = target_id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
    ))
  );

create policy collaborator_invites_delete on public.collaborator_invites for delete to authenticated
  using (
    invited_by = (select auth.uid()) or
    (target_type = 'form' and public.has_form_access(target_id, 'owner')) or
    (target_type = 'workspace' and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = target_id and wm.user_id = (select auth.uid()) and wm.role in ('owner', 'admin')
    ))
  );

/* ------------------------------------------------------------------ */
/* 7. RPC Endpoints for Invites & Collaborators                       */
/* ------------------------------------------------------------------ */

-- Fetch collaborators of a form with user email
create or replace function public.get_form_collaborators(p_form_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_form_access(p_form_id, 'viewer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    fc.id,
    fc.user_id,
    coalesce(u.email::text, 'collaborator@user'),
    fc.role,
    fc.created_at
  from public.form_collaborators fc
  left join auth.users u on u.id = fc.user_id
  where fc.form_id = p_form_id
  order by fc.created_at asc;
end $$;

-- Fetch active pending invites for a form
create or replace function public.get_form_invites(p_form_id uuid)
returns table (
  id uuid,
  email text,
  role text,
  token text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_form_access(p_form_id, 'owner') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    ci.id,
    ci.email,
    ci.role,
    ci.token,
    ci.status,
    ci.created_at,
    ci.expires_at
  from public.collaborator_invites ci
  where ci.target_type = 'form'
    and ci.target_id = p_form_id
    and ci.status = 'pending'
    and ci.expires_at > now()
  order by ci.created_at desc;
end $$;

-- Create an invite for a form or workspace
create or replace function public.create_invite(
  p_target_type text,
  p_target_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_invite record;
  v_clean_email text := lower(trim(p_email));
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  if p_target_type = 'form' then
    if not public.has_form_access(p_target_id, 'owner') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if p_role not in ('editor', 'viewer') then
      raise exception 'invalid_role' using errcode = '22023';
    end if;
  elsif p_target_type = 'workspace' then
    if not exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = p_target_id and wm.user_id = v_user_id and wm.role in ('owner', 'admin')
    ) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if p_role not in ('admin', 'member') then
      raise exception 'invalid_role' using errcode = '22023';
    end if;
  else
    raise exception 'invalid_target_type' using errcode = '22023';
  end if;

  -- Revoke any existing pending invites for this email + target
  update public.collaborator_invites
     set status = 'revoked'
   where target_type = p_target_type
     and target_id = p_target_id
     and lower(email) = v_clean_email
     and status = 'pending';

  insert into public.collaborator_invites (
    email,
    target_type,
    target_id,
    role,
    invited_by
  )
  values (
    v_clean_email,
    p_target_type,
    p_target_id,
    p_role,
    v_user_id
  )
  returning * into v_invite;

  return jsonb_build_object(
    'id', v_invite.id,
    'email', v_invite.email,
    'target_type', v_invite.target_type,
    'target_id', v_invite.target_id,
    'role', v_invite.role,
    'token', v_invite.token,
    'expires_at', v_invite.expires_at
  );
end $$;

-- Accept an invite using invite token
create or replace function public.accept_invite(p_token text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_invite record;
begin
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  select * into v_invite
  from public.collaborator_invites
  where token = p_token;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  if v_invite.status != 'pending' then
    raise exception 'invite_already_used' using errcode = '22000';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = '22000';
  end if;

  if v_invite.target_type = 'form' then
    insert into public.form_collaborators (form_id, user_id, role, invited_by)
    values (v_invite.target_id, v_user_id, v_invite.role, v_invite.invited_by)
    on conflict (form_id, user_id)
    do update set role = excluded.role;
  elsif v_invite.target_type = 'workspace' then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (v_invite.target_id, v_user_id, v_invite.role)
    on conflict (workspace_id, user_id)
    do update set role = excluded.role;
  end if;

  update public.collaborator_invites
     set status = 'accepted'
   where id = v_invite.id;

  return jsonb_build_object(
    'ok', true,
    'target_type', v_invite.target_type,
    'target_id', v_invite.target_id,
    'role', v_invite.role
  );
end $$;

-- Fetch members of a workspace
create or replace function public.get_workspace_members(p_workspace_id uuid)
returns table (
  workspace_id uuid,
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    wm.workspace_id,
    wm.user_id,
    coalesce(u.email::text, 'member@workspace'),
    wm.role,
    wm.created_at
  from public.workspace_members wm
  left join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.created_at asc;
end $$;
