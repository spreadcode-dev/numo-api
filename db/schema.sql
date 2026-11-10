-- NuMo database schema. Idempotent: safe to run again.
-- Runs as the migration user (see db/init-schema.sh) so the default
-- privileges from db/users.sql give the app user access to new tables.
-- Later changes go below as ALTER ... IF NOT EXISTS or guarded DO $$ blocks.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
