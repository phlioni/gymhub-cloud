// supabase/functions/stripe-webhook/index.ts
//
// 1. Instale a dependência do Stripe na pasta da função:
//    deno run --allow-net npm:install stripe
// 2. Configure 'STRIPE_SECRET_KEY' e 'STRIPE_WEBHOOK_SECRET' no Supabase.
//

import Stripe from 'https://esm.sh/stripe@14.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Obtenha este segredo no seu Dashboard Stripe ao criar o endpoint
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature');
    const body = await req.text();

    let event: Stripe.Event;

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            stripeWebhookSecret
        );
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
    }

    // Handle o evento
    switch (event.type) {

        // Evento: Conta conectada foi atualizada (ex: onboarding concluído)
        case 'account.updated':
            const account = event.data.object as Stripe.Account;
            const status = account.charges_enabled ? 'enabled' : (account.details_submitted ? 'pending' : 'restricted');

            console.log(`Atualizando conta ${account.id} para status: ${status}`);

            // Atualiza o status da conta na sua tabela organizations
            const { error } = await supabaseAdmin
                .from('organizations')
                .update({ stripe_account_status: status })
                .eq('stripe_account_id', account.id);

            if (error) {
                console.error(`Erro ao atualizar status da conta ${account.id}:`, error);
            }
            break;

        // Evento: Um checkout (pagamento) foi concluído
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;

            // Aqui você implementa a automação de renovação
            const { student_id, modality_id, organization_id } = session.metadata || {};

            if (student_id && modality_id) {
                console.log(`Pagamento recebido para aluno ${student_id}, modalidade ${modality_id}`);
                //
                // **SUA LÓGICA DE NEGÓCIO AQUI**
                // 1. Encontre a matrícula existente:
                //    SELECT * FROM enrollments WHERE student_id = student_id AND modality_id = modality_id
                //
                // 2. Calcule a nova 'expiry_date' (ex: 30 dias a partir de hoje ou da data antiga)
                //
                // 3. Atualize a matrícula:
                //    UPDATE enrollments SET expiry_date = 'NOVA_DATA' WHERE id = 'ID_DA_MATRICULA'
                //
                // Exemplo (simplificado):
                /*
                const { data: enrollment } = await supabaseAdmin
                  .from('enrollments')
                  .select('id, expiry_date')
                  .eq('student_id', student_id)
                  .eq('modality_id', modality_id)
                  .order('expiry_date', { ascending: false })
                  .limit(1)
                  .single();
        
                if (enrollment) {
                  const newExpiry = new Date();
                  newExpiry.setDate(newExpiry.getDate() + 30);
                  
                  await supabaseAdmin
                    .from('enrollments')
                    .update({ expiry_date: newExpiry.toISOString() })
                    .eq('id', enrollment.id);
                    
                  console.log(`Matrícula ${enrollment.id} renovada.`);
                }
                */
            } else {
                console.warn('Checkout concluído, mas sem metadados (student_id, modality_id) para automação.');
            }

            break;

        default:
            console.log(`Evento não tratado: ${event.type}`);
    }

    // Retorna 200 para o Stripe
    return new Response(JSON.stringify({ received: true }), { status: 200 });
});