// supabase/functions/stripe-webhook/index.ts
//
// 1. Instale a dependência do Stripe na pasta da função:
//    deno run --allow-net npm:install stripe
// 2. Configure 'STRIPE_SECRET_KEY' e 'STRIPE_WEBHOOK_SECRET' no Supabase.
//    (Use as chaves de MODO DE TESTE para desenvolver)
//
import Stripe from 'https://esm.sh/stripe@14.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Headers CORS (Boa prática)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Inicialize o Stripe com sua Chave Secreta (deve ser sk_test_... para testes)
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient()
});
// Cliente Admin do Supabase
const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Segredo do Webhook (deve ser whsec_test_... para testes)
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
Deno.serve(async (req) => {
    // Tratar requisição OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }
    const signature = req.headers.get('Stripe-Signature');
    const body = await req.text();
    let event;
    try {
        if (!signature || !stripeWebhookSecret) {
            throw new Error("Assinatura do webhook ou segredo não configurados.");
        }
        // Constrói e valida o evento usando o segredo
        event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err) {
        console.error(`[TREINEAI WEBHOOK] ❌ Erro na assinatura do Webhook: ${err.message}`);
        return new Response(JSON.stringify({
            error: `Webhook Error: ${err.message}`
        }), {
            status: 400,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
    }
    // Handle o evento
    switch (event.type) {
        // Evento: Conta conectada foi atualizada (ex: onboarding concluído)
        case 'account.updated':
            const account = event.data.object;
            // Determina o status com base nos campos da conta
            const status = account.charges_enabled ? 'enabled' : account.details_submitted ? 'pending' : 'restricted';
            console.log(`[TREINEAI WEBHOOK] 🔔 Evento account.updated recebido. Conta: ${account.id}, Novo Status: ${status}`);
            // Atualiza o status da conta na sua tabela organizations
            const { error: updateError } = await supabaseAdmin.from('organizations').update({
                stripe_account_status: status
            }).eq('stripe_account_id', account.id);
            if (updateError) {
                console.error(`[TREINEAI WEBHOOK] ❌ Erro ao atualizar status da conta ${account.id} no Supabase:`, updateError);
            } else {
                console.log(`[TREINEAI WEBHOOK] ✅ Status da conta ${account.id} atualizado para ${status} no Supabase.`);
            }
            break;
        // Evento: Um checkout (pagamento) foi concluído
        case 'checkout.session.completed':
            const session = event.data.object;
            // Pega os metadados
            // NOTA: No código da função `create-stripe-payment-link` eu enviei `product_id`.
            // Se você quiser que isso atualize uma 'matrícula', você deve enviar 'modality_id'
            // na metadata do checkout. Vou usar 'product_id' como referência aqui.
            const { student_id, product_id, modality_id } = session.metadata || {};
            // Determina se foi um pagamento de assinatura
            const isSubscription = !!session.subscription;
            // Define qual ID de item será usado para a renovação.
            // Dê preferência para 'modality_id' se ele existir (para matrículas).
            const itemToRenewId = modality_id || product_id;
            if (student_id && itemToRenewId) {
                console.log(`[TREINEAI WEBHOOK] 🔔 Evento checkout.session.completed recebido. Aluno: ${student_id}, Item: ${itemToRenewId}, É Assinatura: ${isSubscription}`);
                try {
                    // 1. Encontrar a matrícula existente para este aluno e modalidade/produto
                    //    Estamos assumindo que a tabela 'enrollments' usa 'modality_id'.
                    //    Se você vende "Planos" da tabela "products", talvez você precise
                    //    renovar uma 'enrollment' baseada na 'modality_id' associada ao 'product_id'.
                    //    Por simplicidade, vamos assumir que o 'itemToRenewId' é o 'modality_id'.
                    const { data: enrollment, error: enrollError } = await supabaseAdmin.from('enrollments').select('id, expiry_date').eq('student_id', student_id).eq('modality_id', itemToRenewId) // Chave da renovação
                        .order('expiry_date', {
                            ascending: false
                        }) // Pega a mais recente
                        .limit(1).single();
                    if (enrollError || !enrollment) {
                        console.warn(`[TREINEAI WEBHOOK] ⚠️ Nenhuma matrícula encontrada para student_id: ${student_id} e modality_id: ${itemToRenewId}. O pagamento foi recebido, mas nenhuma matrícula foi atualizada.`);
                        break; // Sai do switch, mas retorna 200 OK para o Stripe
                    }
                    // 2. Calcular a nova data de vencimento
                    const today = new Date();
                    // Converte a data de expiração para um objeto Date (importante para datas)
                    const currentExpiry = new Date(enrollment.expiry_date + "T00:00:00"); // Adiciona T00:00:00 para evitar problemas de fuso
                    // REGRA DE NEGÓCIO:
                    // Se a matrícula já venceu (currentExpiry <= today), renova a partir de HOJE.
                    // Se ainda está ativa (currentExpiry > today), renova a partir da DATA DE VENCIMENTO ANTIGA.
                    const baseDate = currentExpiry > today ? currentExpiry : today;
                    const newExpiry = new Date(baseDate);
                    // 3. Buscar o intervalo do produto (se for assinatura) para saber quanto tempo adicionar
                    let diasParaAdicionar = 30; // Padrão: 30 dias para pagamento único
                    // Se for uma assinatura OU um pagamento único de um produto (product_id), busca o intervalo
                    if (product_id) {
                        const { data: product } = await supabaseAdmin.from('products').select('recurring_interval')// Usamos product_id aqui, pois modality_id pode não ser o mesmo que o ID do produto
                            .eq('id', product_id).single();
                        if (product?.recurring_interval === 'month') {
                            newExpiry.setMonth(newExpiry.getMonth() + 1);
                            diasParaAdicionar = 0; // Já foi calculado
                        } else if (product?.recurring_interval === 'year') {
                            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
                            diasParaAdicionar = 0; // Já foi calculado
                        } else if (product?.recurring_interval === 'week') {
                            newExpiry.setDate(newExpiry.getDate() + 7);
                            diasParaAdicionar = 0; // Já foi calculado
                        }
                    }
                    // Se for um pagamento único (diasParaAdicionar ainda é 30)
                    if (diasParaAdicionar > 0) {
                        newExpiry.setDate(newExpiry.getDate() + diasParaAdicionar);
                    }
                    // 4. Atualizar a matrícula no Supabase
                    const newExpiryDateString = newExpiry.toISOString().split('T')[0]; // Formato YYYY-MM-DD
                    const { error: updateError } = await supabaseAdmin.from('enrollments').update({
                        expiry_date: newExpiryDateString
                    }).eq('id', enrollment.id);
                    if (updateError) throw updateError;
                    console.log(`[TREINEAI WEBHOOK] ✅ Matrícula ${enrollment.id} renovada com sucesso para ${newExpiryDateString}.`);
                } catch (dbError) {
                    console.error(`[TREINEAI WEBHOOK] ❌ Erro de banco de dados ao processar renovação: ${dbError.message}`);
                    // Não retorne um erro 500 para o Stripe, pois o pagamento já foi feito.
                }
            } else {
                console.warn('[TREINEAI WEBHOOK] ⚠️ Checkout concluído, mas sem metadados (student_id, modality_id/product_id) para automação.');
            }
            break;
        default:
            console.log(`[TREINEAI WEBHOOK] ℹ️ Evento não tratado recebido: ${event.type}`);
    }
    // Retorna 200 para o Stripe saber que o evento foi recebido com sucesso
    return new Response(JSON.stringify({
        received: true
    }), {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });
});
