// supabase/functions/create-stripe-payment-link/index.ts
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
        // 1. Setup Supabase e autenticação
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
        const { stripePriceId, studentId, organizationId, recurring } = await req.json();
        if (!stripePriceId || !organizationId) {
            throw new Error("ID do Preço e ID da Organização são obrigatórios.");
        }

        // 3. Obter a conta Stripe do personal
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('stripe_account_id, stripe_account_status')
            .eq('id', organizationId)
            .single();

        const stripeAccountId = org?.stripe_account_id;
        if (!stripeAccountId || org?.stripe_account_status !== 'enabled') {
            throw new Error('A conta Stripe desta organização não está ativa.');
        }

        // 4. Calcular o spread (sua comissão)
        const YOUR_SPREAD_PERCENTAGE = 0.05; // 5%
        const priceObject = await stripe.prices.retrieve(stripePriceId, { stripeAccount: stripeAccountId });
        const amountInCents = priceObject.unit_amount;

        if (amountInCents === null) {
            throw new Error("Não foi possível encontrar o valor do preço.");
        }

        const applicationFee = Math.floor(amountInCents * YOUR_SPREAD_PERCENTAGE);

        // 5. Montar os dados do Link de Pagamento
        let paymentLinkData: Stripe.PaymentLinkCreateParams = {
            line_items: [{ price: stripePriceId, quantity: 1 }],
            metadata: {
                student_id: studentId || 'venda_avulsa',
                organization_id: organizationId,
            },
        };

        // 6. Adicionar lógica de comissão (spread) e tipo (pagamento ou assinatura)
        if (recurring) {
            // É uma Assinatura
            paymentLinkData.subscription_data = {
                application_fee_percent: YOUR_SPREAD_PERCENTAGE * 100, // Para recorrência, usamos porcentagem
            };
        } else {
            // É um Pagamento Único
            paymentLinkData.payment_intent_data = {
                application_fee_amount: applicationFee, // Para pagamento único, usamos valor fixo
            };
        }

        // 7. Criar o Link de Pagamento NA CONTA CONECTADA
        const paymentLink = await stripe.paymentLinks.create(paymentLinkData, {
            stripeAccount: stripeAccountId,
        });

        // 8. Retornar a URL do link
        return new Response(
            JSON.stringify({ paymentLinkUrl: paymentLink.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error("Erro ao criar link de pagamento:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});