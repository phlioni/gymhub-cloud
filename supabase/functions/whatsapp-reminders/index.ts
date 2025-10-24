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
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
        // Usaremos uma única variável de ambiente para o SID do template.
        // O SID que você forneceu: HXd70590e37c79b9adec81fcfc747b6dcf
        const templateSid = Deno.env.get('TWILIO_TEMPLATE_SID_RENEWAL');
        if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom || !templateSid) {
            throw new Error("As variáveis de ambiente do Twilio, incluindo TWILIO_TEMPLATE_SID_RENEWAL, não estão configuradas corretamente.");
        }
        const supabaseAdminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        // 1. Buscar todas as organizações ativas que têm configurações de lembrete
        const { data: organizations, error: orgError } = await supabaseAdminClient.from('organizations').select('id, name, reminder_days, payment_details');
        if (orgError) throw orgError;
        let totalMessagesSent = 0;
        // 2. Iterar sobre cada organização
        for (const org of organizations) {
            if (!org.reminder_days || org.reminder_days.length === 0) {
                console.log(`Organização "${org.name}" não possui dias de lembrete configurados. Pulando.`);
                continue;
            }
            // 3. Para cada dia de lembrete configurado, buscar alunos
            for (const days of org.reminder_days) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + days);
                const formattedTargetDate = targetDate.toISOString().split('T')[0];
                const { data: enrollments, error: enrollError } = await supabaseAdminClient.from('enrollments').select('*, students(name, phone_number)').eq('expiry_date', formattedTargetDate).not('students', 'is', null) // Garante que o aluno não foi deletado
                    .eq('students.organization_id', org.id); // Filtra por organização
                if (enrollError) {
                    console.error(`Erro ao buscar matrículas para ${org.name}:`, enrollError);
                    continue;
                }
                // 4. Enviar mensagem para cada aluno encontrado
                for (const enrollment of enrollments) {
                    const student = enrollment.students; // Cast para simplificar
                    const to = student?.phone_number;
                    const studentName = student?.name;
                    const paymentLink = org.payment_details || 'Fale com a recepção para renovar.';
                    // Lógica para a nova variável de tempo
                    const expirationText = days === 1 ? 'amanhã' : `em ${days} dias`;
                    if (to && studentName) {
                        const messageData = new URLSearchParams({
                            To: `whatsapp:${to}`,
                            From: `whatsapp:${twilioWhatsAppFrom.replace('whatsapp:', '')}`,
                            ContentSid: templateSid,
                            ContentVariables: JSON.stringify({
                                '1': studentName,
                                '2': org.name,
                                '3': paymentLink,
                                '4': expirationText
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
                            console.error(`Falha ao enviar para ${to} (Org: ${org.name}):`, await response.text());
                        } else {
                            console.log(`Mensagem enviada para ${studentName} (${to}) - ${days} dias para vencer.`);
                            totalMessagesSent++;
                        }
                    }
                }
            }
        }
        return new Response(JSON.stringify({
            message: `Verificação concluída. ${totalMessagesSent} mensagens enviadas.`
        }), {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            status: 200
        });
    } catch (error) {
        console.error("Erro na função whatsapp-reminders:", error);
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
