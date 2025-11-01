// supabase/functions/create-stripe-product/index.ts
//
// 1. Instale a dependência do Stripe na pasta da função:
//    deno run --allow-net npm:install stripe
// 2. Configure 'STRIPE_SECRET_KEY' no Supabase.
//

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0';

// Inicialize o Stripe com sua Chave Secreta
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
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
        if (!user) throw new Error('Usuário não autenticado');

        // 2. Obter dados do frontend
        const {
            name,
            description,
            product_type, // 'physical' or 'service'
            price, // Preço em R$ (ex: 89.90)
            recurring_interval // null, 'month', 'year', 'week'
        } = await req.json();

        if (!name || !price || !product_type) {
            throw new Error("Nome, preço e tipo de produto são obrigatórios.");
        }

        // 3. Obter o profile e a conta Stripe do usuário
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id, organizations(stripe_account_id, stripe_account_status)')
            .eq('id', user.id)
            .single();

        // @ts-ignore
        const orgData = profile?.organizations;
        const stripeAccountId = orgData?.stripe_account_id;
        const stripeAccountStatus = orgData?.stripe_account_status;

        if (!stripeAccountId || stripeAccountStatus !== 'enabled') {
            throw new Error('A conta Stripe não está conectada ou não está ativa. Vá para Configurações > Integrações.');
        }

        // 4. Criar o Produto no Stripe NA CONTA CONECTADA
        const product = await stripe.products.create({
            name: name,
            description: description || undefined,
            type: product_type === 'physical' ? 'good' : 'service',
        }, {
            stripeAccount: stripeAccountId, // <--- ISSO CRIA O PRODUTO NA CONTA DO USUÁRIO
        });

        // 5. Preparar dados do Preço
        const priceInCents = Math.round(parseFloat(price) * 100);
        let priceData: Stripe.PriceCreateParams = {
            product: product.id,
            unit_amount: priceInCents,
            currency: 'brl',
        };

        if (recurring_interval && recurring_interval !== 'one_time') {
            priceData.recurring = {
                interval: recurring_interval as Stripe.PriceCreateParams.Recurring.Interval,
            };
        }

        // 6. Criar o Preço no Stripe NA CONTA CONECTADA
        const priceObject = await stripe.prices.create(priceData, {
            stripeAccount: stripeAccountId, // <--- ISSO CRIA O PREÇO NA CONTA DO USUÁRIO
        });

        // 7. Retornar os IDs para o frontend salvar no Supabase
        return new Response(
            JSON.stringify({
                stripe_product_id: product.id,
                stripe_price_id: priceObject.id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error("Erro ao criar produto no Stripe:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});