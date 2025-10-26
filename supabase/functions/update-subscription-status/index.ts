import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Busca organizações com trial expirado que ainda não foram atualizadas
        const { data: expiredTrials, error: trialError } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('subscription_status', 'trial')
            .lt('trial_expires_at', new Date().toISOString());

        if (trialError) throw trialError;

        let updatedCount = 0;

        if (expiredTrials && expiredTrials.length > 0) {
            const idsToUpdate = expiredTrials.map(org => org.id);
            const { error: updateError } = await supabaseAdmin
                .from('organizations')
                .update({ subscription_status: 'overdue' }) // Muda o status para 'vencido'
                .in('id', idsToUpdate);

            if (updateError) throw updateError;
            updatedCount = idsToUpdate.length;
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Verificação concluída. ${updatedCount} organizações atualizadas para 'overdue'.`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Erro na função update-subscription-status:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});