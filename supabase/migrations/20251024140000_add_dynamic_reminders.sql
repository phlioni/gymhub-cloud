-- Adiciona colunas para detalhes de pagamento e configuração de lembretes na tabela de organizações
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS payment_details TEXT,
ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT ARRAY[3, 1];

-- Garante que a função de serviço possa ler as novas colunas
GRANT SELECT ON TABLE public.organizations TO service_role;