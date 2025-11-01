// supabase/functions/create-student-payment/index.ts
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
        // O frontend deve enviar: { studentId: "...", modalityId: "...", organizationId: "...", amountInCents: 10000, modalityName: "..." }
        const { studentId, modalityId, organizationId, amountInCents, modalityName } = await req.json();

        if (!studentId || !modalityId || !organizationId || !amountInCents) {
            throw new Error("Dados insuficientes para criar cobrança.");
        }

        // 3. Buscar o stripe_account_id do personal (da tabela organizations)
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('stripe_account_id, stripe_account_status')
            .eq('id', organizationId)
            .single();

        if (!org || !org.stripe_account_id) {
            throw new Error('Conta Stripe não conectada para esta organização.');
        }
        if (org.stripe_account_status !== 'enabled') {
            throw new Error(`A conta Stripe desta organização não está ativa (${org.stripe_account_status}). Finalize o cadastro no Stripe.`);
        }

        // 4. Calcula sua comissão (ex: 5%)
        const YOUR_SPREAD_PERCENTAGE = 0.05; // 5%
        const applicationFee = Math.floor(amountInCents * YOUR_SPREAD_PERCENTAGE); // Stripe exige centavos (inteiro)

        // 5. Cria a Sessão de Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'pix', 'boleto'],
            line_items: [{
                price_data: {
                    currency: 'brl',
                    product_data: {
                        name: modalityName || 'Pagamento de Mensalidade',
                    },
                    unit_amount: amountInCents, // Valor em centavos (ex: 10000 para R$ 100,00)
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://[SEU_DOMINIO_TREINEAI]/dashboard?payment=success',
            cancel_url: 'https://[SEU_DOMINIO_TREINEAI]/students',
            payment_intent_data: {
                application_fee_amount: applicationFee, // **A SUA COMISSÃO (SPREAD)**
            },
            metadata: { // Metadados para seu webhook
                student_id: studentId,
                modality_id: modalityId,
                organization_id: organizationId
            }
        }, {
            stripeAccount: org.stripe_account_id, // **A CONTA DO PERSONAL QUE RECEBE O DINHEIRO**
        });

        // 6. Retorna a URL do checkout para o frontend
        return new Response(
            JSON.stringify({ checkoutUrl: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});