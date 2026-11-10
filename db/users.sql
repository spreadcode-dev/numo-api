-- Least-privilege roles for numo_db. Idempotent: safe to run again.
-- Required psql variables: db_name, app_user, app_password,
-- migration_user, migration_password (see db/init-users.sh).

-- psql variables don't expand inside DO $$ blocks, so roles are created via \gexec.
SELECT format('CREATE ROLE %I LOGIN', :'migration_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'migration_user')
\gexec

SELECT format('CREATE ROLE %I LOGIN', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

-- Re-applied on every run so a password changed in .env takes effect.
ALTER ROLE :"migration_user" WITH LOGIN PASSWORD :'migration_password';
ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';

REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"migration_user", :"app_user";

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO :"migration_user";
GRANT USAGE ON SCHEMA public TO :"app_user";

-- Tables are created by the migration user, so default privileges must be
-- declared FOR ROLE it; otherwise the app user can't reach migrated tables.
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_user" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";

-- Covers tables that already existed before this run.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
