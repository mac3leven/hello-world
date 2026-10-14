#!/usr/bin/env bash
# Runs the migration + security tests against a throwaway local Postgres (no Docker needed).
# Usage: supabase/tests/run-local.sh   (needs initdb/pg_ctl/psql on PATH or in /usr/lib/postgresql/*/bin)
set -euo pipefail
# Postgres refuses to run as root; in containers, hop to the postgres user.
if [ "$(id -u)" = 0 ] && id postgres >/dev/null 2>&1; then exec runuser -u postgres -- "$0" "$@"; fi
here="$(cd "$(dirname "$0")" && pwd)"
bin="$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"
tmp="$(mktemp -d)"
trap '"$bin/pg_ctl" -D "$tmp/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$tmp"' EXIT
"$bin/initdb" -D "$tmp/data" -U postgres -A trust >/dev/null
"$bin/pg_ctl" -D "$tmp/data" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
run() { psql -h "$tmp" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$1"; }
run "$here/supabase_stub.sql"
for m in "$here"/../migrations/*.sql; do run "$m"; done
run "$here/rls_test.sql"
