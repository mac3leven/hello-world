-- Security tests for the family space. Run with ./run-local.sh (plain Postgres).
-- Each block raises an exception (failing the run) if a guarantee is broken.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'alex@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'blair@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'casey@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'dana@example.com');

create function pg_temp.login(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || p_user, 'email', p_user || '@example.com', 'role', 'authenticated')::text, false);
$$;

set role authenticated;

-- Alex creates a family and adds an event.
select pg_temp.login('a');
select public.create_family('McFamily') as fam \gset
insert into public.family_records (family_id, kind, id, data) values (:'fam', 'event', 'e1', '{"title":"Soccer"}');
select code as invite from public.create_invite() \gset
-- DO blocks can't see psql variables, so expose them as settings.
select set_config('test.fam', :'fam', false), set_config('test.invite', :'invite', false) \g /dev/null

-- Casey has their own family.
select pg_temp.login('c');
select public.create_family('Other family') as other_fam \gset
insert into public.family_records (family_id, kind, id, data) values (:'other_fam', 'event', 'x1', '{"title":"Secret"}');

-- 1. Casey cannot see, change, or add to Alex's family.
do $$ begin
  if exists (select 1 from public.family_records where data->>'title' = 'Soccer') then raise exception 'FAIL: cross-family read'; end if;
  if (select count(*) from public.families) <> 1 then raise exception 'FAIL: can see other families'; end if;
  if (select count(*) from public.family_users) <> 1 then raise exception 'FAIL: can see other family users'; end if;
  if exists (select 1 from public.family_invites) then raise exception 'FAIL: can see other invites'; end if;
end $$;
update public.family_records set data = '{"title":"pwned"}' where id = 'e1';
do $$ begin
  begin
    execute format('insert into public.family_records (family_id, kind, id, data) values (%L, %L, %L, %L)',
      current_setting('test.fam'), 'event', 'evil', '{}');
    raise exception 'FAIL: cross-family insert allowed';
  exception when insufficient_privilege then null; -- RLS violation
  end;
end $$;

-- 2. Casey cannot join Alex's family without the code, cannot add themselves directly, and is limited to one family.
do $$ begin
  begin
    insert into public.family_users (family_id, user_id) values (current_setting('test.fam')::uuid, auth.uid());
    raise exception 'FAIL: direct join allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.accept_invite('NOPE-NOPE-NOPE-NOPE');
    raise exception 'FAIL: bogus invite accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.accept_invite(current_setting('test.invite'));
    raise exception 'FAIL: user joined a second family';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- 3. Signed-in users cannot touch AI usage counters.
do $$ begin
  begin
    perform public.increment_ai_usage(current_setting('test.fam')::uuid);
    raise exception 'FAIL: user can bump AI usage';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.ai_usage;
    raise exception 'FAIL: user can read AI usage';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. Blair joins with the invite and sees the shared plan; the code can't be reused.
select pg_temp.login('b');
do $$ begin
  if public.accept_invite(lower(current_setting('test.invite'))) <> current_setting('test.fam')::uuid then raise exception 'FAIL: wrong family'; end if;
  if not exists (select 1 from public.family_records where id = 'e1' and data->>'title' = 'Soccer') then raise exception 'FAIL: partner cannot read (or data was tampered)'; end if;
  if (select count(*) from public.family_users) <> 2 then raise exception 'FAIL: partner should see both parents'; end if;
  update public.family_records set data = '{"title":"Soccer (moved)"}' where id = 'e1';
  if not found then raise exception 'FAIL: partner cannot edit'; end if;
  if (select updated_by from public.family_records where id = 'e1') <> auth.uid() then raise exception 'FAIL: updated_by not stamped'; end if;
end $$;
-- Dana has no family yet, so the only thing stopping her is the used code (and expiry).
select pg_temp.login('a');
select code as invite2 from public.create_invite() \gset
reset role;
update public.family_invites set expires_at = now() - interval '1 minute' where code = :'invite2';
select set_config('test.invite2', :'invite2', false);
set role authenticated;
select pg_temp.login('d');
do $$ begin
  begin
    perform public.accept_invite(current_setting('test.invite2'));
    raise exception 'FAIL: expired invite accepted';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    perform public.accept_invite(current_setting('test.invite'));
    raise exception 'FAIL: invite reused';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- 5. Signed-out requests get nothing.
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
do $$ begin
  begin
    perform 1 from public.family_records;
    raise exception 'FAIL: anon can query records';
  exception when insufficient_privilege then null; end;
  begin
    perform public.create_family('x');
    raise exception 'FAIL: anon can create a family';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
\echo 'All RLS tests passed'
