import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }
    try {
        // --- ALTERAÇÃO 1: Carrega todos os segredos necessários ---
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
        // Mapeia os dias aos seus respectivos SIDs de template
        const templateSids = {
            10: Deno.env.get('TWILIO_TEMPLATE_SID_10_DAYS'),
            6: Deno.env.get('TWILIO_TEMPLATE_SID_6_DAYS'),
            3: Deno.env.get('TWILIO_TEMPLATE_SID_3_DAYS'),
            1: Deno.env.get('TWILIO_TEMPLATE_SID_1_DAY')
        };
        if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom || !templateSids[10] || !templateSids[3]) {
            throw new Error("As variáveis de ambiente do Twilio ou os SIDs dos templates não estão configurados corretamente.");
        }
        const supabaseAdminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        const daysToCheck = [
            10,
            6,
            3,
            1
        ];
        let messagesSentCount = 0;
        for (const days of daysToCheck) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            const formattedTargetDate = targetDate.toISOString().split('T')[0];
            const { data: enrollments, error } = await supabaseAdminClient.from('enrollments').select(`students ( name, phone_number ), modalities ( organizations ( name ) )`).eq('expiry_date', formattedTargetDate);
            if (error) throw error;
            for (const enrollment of enrollments) {
                // @ts-ignore
                const student = enrollment.students;
                // @ts-ignore
                const organizationName = enrollment.modalities?.organizations?.name;
                const to = student?.phone_number;
                // --- ALTERAÇÃO 2: Seleciona o SID do template dinamicamente ---
                const templateSidForDay = templateSids[days];
                if (to && student?.name && organizationName && templateSidForDay) {
                    // --- ALTERAÇÃO 3: Monta a mensagem usando o template e variáveis ---
                    // O parâmetro 'Body' é removido, e 'ContentSid' e 'ContentVariables' são usados
                    const messageData = new URLSearchParams({
                        To: `whatsapp:${to}`,
                        From: `whatsapp:${twilioWhatsAppFrom.replace('whatsapp:', '')}`,
                        ContentSid: templateSidForDay,
                        ContentVariables: JSON.stringify({
                            '1': student.name,
                            '2': days.toString()
                        })
                    });
                    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: messageData
                    });
                    if (!response.ok) {
                        console.error(`Falha ao enviar para ${to}:`, await response.text());
                    } else {
                        console.log(`Mensagem (template ${templateSidForDay}) enviada para ${student.name} (${to}) - ${days} dias para vencer.`);
                        messagesSentCount++;
                    }
                }
            }
        }
        return new Response(JSON.stringify({
            message: `Verificação concluída. ${messagesSentCount} mensagens enviadas.`
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 200
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({
            error: error.message
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 500
        });
    }
});
