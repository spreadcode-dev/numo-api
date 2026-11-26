-- NuMo database schema. Idempotent: safe to run again.
-- Runs as the migration user (see db/init-schema.sh) so the default
-- privileges from db/users.sql give the app user access to new tables.
-- Later changes go below as ALTER ... IF NOT EXISTS or guarded DO $$ blocks.
-- Required psql variable: app_user (see db/init-schema.sh), for per-table grants.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id),
    family_id UUID NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by_id UUID REFERENCES refresh_tokens (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_family_id_idx ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id),
    name VARCHAR(60) NOT NULL,
    type TEXT NOT NULL CONSTRAINT accounts_type_check
        CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
    currency CHAR(3) NOT NULL DEFAULT 'BRL' CONSTRAINT accounts_currency_check
        CHECK (currency = 'BRL'),
    opening_balance BIGINT NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_id_name_lower_key
    ON accounts (user_id, lower(name));

-- Only the format is checked here: the palette lives in the API (LabelColor),
-- so changing it needs no schema change.
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id),
    name VARCHAR(30) NOT NULL,
    color CHAR(7) NOT NULL CONSTRAINT labels_color_check
        CHECK (color ~ '^#[0-9a-f]{6}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS labels_user_id_name_lower_key
    ON labels (user_id, lower(name));

-- DELETE is granted per table, only where users may delete rows (least privilege).
GRANT DELETE ON labels TO :"app_user";

-- amount is signed integer cents: negative is an expense, positive an income.
-- date is a calendar day with no time zone.
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id),
    account_id UUID NOT NULL REFERENCES accounts (id),
    date DATE NOT NULL,
    amount BIGINT NOT NULL CONSTRAINT transactions_amount_check CHECK (amount <> 0),
    description VARCHAR(140) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_date_id_idx
    ON transactions (user_id, date DESC, id DESC);

-- Serves the account balance (opening_balance + SUM(amount) per account).
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON transactions (account_id);

GRANT DELETE ON transactions TO :"app_user";

-- Which labels tag which transaction. Deleting either side removes the link.
CREATE TABLE IF NOT EXISTS transaction_labels (
    transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels (id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, label_id)
);

-- Serves the cascade when a label is deleted and the ?labelId= filter.
CREATE INDEX IF NOT EXISTS transaction_labels_label_id_idx
    ON transaction_labels (label_id);

GRANT DELETE ON transaction_labels TO :"app_user";
