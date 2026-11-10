#!/usr/bin/env bash
# Applies db/schema.sql as the migration user, so the tables it creates get the
# app user's default privileges. Runs on the container's first boot and via `yarn db:schema`

set -euo pipefail

psql -v ON_ERROR_STOP=1 \
    --username "$DB_MIGRATION_USER" \
    --dbname "$POSTGRES_DB" \
    -f /db/schema.sql
