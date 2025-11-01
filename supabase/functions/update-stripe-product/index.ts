// supabase/functions/update-stripe-product/index.ts
//
// 1. Instale a dependência do Stripe na pasta da função:
//    deno run --allow-net npm:install stripe
// 2. Configure 'STRIPE_SECRET_KEY' no Supabase.
//

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Autenticação e Setup
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
        if (!user) throw new Error('Usuário não autenticado');

        // 2. Obter dados do frontend
        const { stripeProductId, name, description } = await req.json();
        if (!stripeProductId || !name) {
            throw new Error("ID do Produto e Nome são obrigatórios.");
        }

        // 3. Obter a conta Stripe do personal (para autenticar a chamada)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organizations(stripe_account_id)')
            .eq('id', user.id)
            .single();

        // @ts-ignore
        const stripeAccountId = profile?.organizations?.stripe_account_id;
        if (!stripeAccountId) {
            throw new Error('Conta Stripe não conectada.');
        }

        // 4. Atualizar o Produto no Stripe NA CONTA CONECTADA
        const product = await stripe.products.update(
            stripeProductId,
            {
                name: name,
                description: description || undefined,
            },
            {
                stripeAccount: stripeAccountId,
            }
        );

        // 5. Retornar sucesso
        return new Response(
            JSON.stringify({ success: true, updatedProduct: product }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error("Erro ao atualizar produto no Stripe:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});