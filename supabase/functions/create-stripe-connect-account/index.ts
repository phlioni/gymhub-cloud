// supabase/functions/create-stripe-connect-account/index.ts
//
// 1. Instale a dependência do Stripe na pasta da função:
//    deno run --allow-net npm:install stripe
// 2. Configure a variável de ambiente 'STRIPE_SECRET_KEY' no Supabase.
//

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0'; // Use uma versão recente da API

// Inicialize o Stripe com sua Chave Secreta
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16', // Use a versão da API que você está testando
    httpClient: Stripe.createFetchHttpClient(),
});

// Headers CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Tratar requisição OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Setup Supabase com autenticação do usuário
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const userSupabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user } } = await userSupabaseClient.auth.getUser();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Obter o profile e organizationId do usuário
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        const orgId = profile?.organization_id;
        if (!orgId) {
            return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Criar a Conta Conectada (Standard Account) no Stripe
        const account = await stripe.accounts.create({
            type: 'standard',
            email: user.email,
            business_type: 'individual', // Assume "individual" (Personal) por padrão
            // Você pode adicionar mais metadados aqui, se desejar
            // metadata: {
            //   organization_id: orgId,
            // }
        });

        // 4. Salvar o ID da conta no seu banco de dados
        const { error: updateError } = await supabaseAdmin
            .from('organizations')
            .update({
                stripe_account_id: account.id,
                stripe_account_status: 'pending' // Estado inicial
            })
            .eq('id', orgId);

        if (updateError) throw updateError;

        // 5. Criar o Link de Onboarding (Onde o usuário preenche os dados no Stripe)
        // Substitua as URLs pelo seu domínio de produção
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: 'https://www.treineaiapp.com/settings', // Para onde volta se falhar
            return_url: 'https://www.treineaiapp.com/settings',  // Para onde volta se tiver sucesso
            type: 'account_onboarding',
        });

        // 6. Retornar a URL para o frontend redirecionar
        return new Response(
            JSON.stringify({ onboardingUrl: accountLink.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});