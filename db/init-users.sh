#!/usr/bin/env bash
# Creates or updates the API's database roles from the container's environment.
# Runs on the container's first boot and via `yarn db:users`.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v db_name="$POSTGRES_DB" \
  -v app_user="$DB_APP_USER" \
  -v app_password="$DB_APP_PASSWORD" \
  -v migration_user="$DB_MIGRATION_USER" \
  -v migration_password="$DB_MIGRATION_PASSWORD" \
  -f /db/users.sql
