-- migration_add_stripe_connect.sql
-- Adiciona colunas à tabela 'organizations' para armazenar
-- a ID da conta Stripe Connect e seu status de ativação.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'restricted';