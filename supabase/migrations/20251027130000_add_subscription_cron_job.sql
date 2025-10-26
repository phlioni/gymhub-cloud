-- Agenda a função 'update-subscription-status' para ser executada todos os dias à meia-noite (UTC).
-- A expressão cron '0 0 * * *' significa: no minuto 0, da hora 0, todos os dias do mês, todos os meses, todos os dias da semana.
SELECT cron.schedule(
    'daily-subscription-update',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url:='https://jayevpbcmuephtkgwxyw.supabase.co/functions/v1/update-subscription-status',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb
    )
    $$
);

-- NOTA IMPORTANTE:
-- 1. Ative a extensão 'pg_cron' no seu painel do Supabase em "Database" -> "Extensions".
-- 2. Substitua 'YOUR_SUPABASE_ANON_KEY' pela sua chave anônima (Publishable Key) do Supabase.
--    Você pode encontrá-la no arquivo .env (VITE_SUPABASE_PUBLISHABLE_KEY) ou no painel do Supabase.