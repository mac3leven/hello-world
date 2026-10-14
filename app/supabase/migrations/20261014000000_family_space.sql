-- Family Huddle: shared family space.
--
-- Security model
--   * Every table has row-level security (RLS) on. Clients only ever use the anon key + a user JWT.
--   * A user belongs to at most one family. Access to anything is "am I in this family?",
--     answered by is_family_member(), which is SECURITY DEFINER so policies don't recurse.
--   * Joining a family is only possible through a single-use, expiring invite code (accept_invite).
--   * AI usage counters are writable only by the service role (the edge function).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.family_users (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  role text not null default 'parent' check (role in ('owner', 'parent')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (user_id) -- one family per account
);

-- The family's plan, one row per member/place/event/settings object.
-- Generic on purpose: the app's data model can evolve without migrations.
-- Rows are soft-deleted (deleted = true) so deletions sync through RLS-checked realtime UPDATEs.
create table public.family_records (
  family_id uuid not null references public.families (id) on delete cascade,
  kind text not null check (kind in ('member', 'place', 'event', 'settings')),
  id text not null check (char_length(id) between 1 and 64),
  data jsonb not null check (pg_column_size(data) < 65536),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (family_id, kind, id)
);

create table public.family_invites (
  code text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);

create table public.ai_usage (
  family_id uuid not null references public.families (id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (family_id, day)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_family_member(fid uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_users fu where fu.family_id = fid and fu.user_id = auth.uid()
  );
$$;

create function public.touch_updated()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger family_records_touch
before insert or update on public.family_records
for each row execute function public.touch_updated();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.family_users enable row level security;
alter table public.family_records enable row level security;
alter table public.family_invites enable row level security;
alter table public.ai_usage enable row level security; -- no policies: service role only

create policy "members read their family" on public.families
  for select to authenticated using (public.is_family_member(id));
create policy "members rename their family" on public.families
  for update to authenticated using (public.is_family_member(id)) with check (public.is_family_member(id));

create policy "members see who has access" on public.family_users
  for select to authenticated using (public.is_family_member(family_id));
create policy "users can leave" on public.family_users
  for delete to authenticated using (user_id = auth.uid());

create policy "members read records" on public.family_records
  for select to authenticated using (public.is_family_member(family_id));
create policy "members add records" on public.family_records
  for insert to authenticated with check (public.is_family_member(family_id));
create policy "members change records" on public.family_records
  for update to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "members see invites" on public.family_invites
  for select to authenticated using (public.is_family_member(family_id));
create policy "members cancel invites" on public.family_invites
  for delete to authenticated using (public.is_family_member(family_id));

-- Belt and braces: no table access at all for signed-out (anon) requests.
revoke all on public.families, public.family_users, public.family_records, public.family_invites, public.ai_usage from anon;
revoke all on public.ai_usage from authenticated;

-- ---------------------------------------------------------------------------
-- RPCs (the only way to create a family, invite someone, or join)
-- ---------------------------------------------------------------------------

create function public.create_family(p_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_family uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.family_users where user_id = auth.uid()) then
    raise exception 'already in a family';
  end if;
  insert into public.families (name) values (coalesce(nullif(trim(p_name), ''), 'Our family'))
    returning id into v_family;
  insert into public.family_users (family_id, user_id, email, role)
    values (v_family, auth.uid(), auth.jwt() ->> 'email', 'owner');
  return v_family;
end;
$$;

create function public.create_invite()
returns table (code text, expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_code text;
begin
  select fu.family_id into v_family from public.family_users fu where fu.user_id = auth.uid();
  if v_family is null then raise exception 'not in a family'; end if;
  -- 64 random bits from the CSPRNG behind gen_random_uuid(), formatted XXXX-XXXX-XXXX-XXXX.
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4) || '-' || substr(v_code, 13, 4);
  return query
    insert into public.family_invites as i (code, family_id, created_by)
    values (v_code, v_family, auth.uid())
    returning i.code, i.expires_at;
end;
$$;

create function public.accept_invite(p_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invite public.family_invites;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.family_users where user_id = auth.uid()) then
    raise exception 'already in a family';
  end if;
  select * into v_invite from public.family_invites
    where code = upper(trim(p_code)) for update;
  if v_invite.code is null or v_invite.used_by is not null or v_invite.expires_at < now() then
    raise exception 'invite is invalid or expired';
  end if;
  update public.family_invites set used_by = auth.uid(), used_at = now() where code = v_invite.code;
  insert into public.family_users (family_id, user_id, email, role)
    values (v_invite.family_id, auth.uid(), auth.jwt() ->> 'email', 'parent');
  return v_invite.family_id;
end;
$$;

-- Called by the `extract` edge function with the service role. Returns today's count after incrementing.
create function public.increment_ai_usage(p_family uuid)
returns integer
language sql security definer
set search_path = ''
as $$
  insert into public.ai_usage as u (family_id, day, count) values (p_family, current_date, 1)
  on conflict (family_id, day) do update set count = u.count + 1
  returning u.count;
$$;

revoke execute on function public.create_family(text), public.create_invite(), public.accept_invite(text),
  public.increment_ai_usage(uuid), public.is_family_member(uuid) from public, anon;
grant execute on function public.create_family(text), public.create_invite(), public.accept_invite(text),
  public.is_family_member(uuid) to authenticated;
revoke execute on function public.increment_ai_usage(uuid) from authenticated;
grant execute on function public.increment_ai_usage(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: both parents see changes live (RLS still applies to what each receives).
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.family_records;
  end if;
end;
$$;
