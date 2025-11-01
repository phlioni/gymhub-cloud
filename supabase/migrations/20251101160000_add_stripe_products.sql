-- migration_add_stripe_products.sql

-- Adiciona colunas à tabela 'products' para sincronização com o Stripe
-- e para diferenciar tipos de produtos e preços.

-- 1. Adiciona o ID do Produto do Stripe
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- 2. Adiciona o ID do Preço do Stripe
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- 3. Adiciona o tipo de produto (Físico ou Serviço/Aula)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'physical'
CHECK (product_type IN ('physical', 'service'));

-- 4. Adiciona o intervalo de recorrência (para assinaturas)
-- NULL ou 'one_time' = Pagamento único
-- 'month', 'year', 'week', 'day' = Recorrente
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS recurring_interval TEXT;

-- 5. Adiciona um índice para o ID do produto Stripe
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id
ON public.products (stripe_product_id);