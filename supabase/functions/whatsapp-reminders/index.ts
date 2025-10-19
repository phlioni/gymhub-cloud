import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORREÇÃO: corsHeaders movido para dentro do arquivo.
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Textos amigáveis para as mensagens
const messageTemplates: { [key: number]: string } = {
    10: "Olá {studentName}! 👋 Sua matrícula na {orgName} está quase vencendo. Faltam 10 dias! Que tal já garantir sua renovação e não perder o ritmo? 💪",
    6: "Olá {studentName}! Passando para lembrar que sua matrícula na {orgName} vence em 6 dias. Continue focado nos seus objetivos! 😉",
    3: "Estamos na contagem regressiva, {studentName}! Sua matrícula na {orgName} vence em 3 dias. Não deixe para a última hora, renove e continue treinando com a gente. 🔥",
    1: "Atenção, {studentName}! Sua matrícula na {orgName} vence amanhã. Renove hoje mesmo para não interromper seus treinos. Esperamos você! 👍"
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

        if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
            throw new Error("As variáveis de ambiente do Twilio não estão configuradas.");
        }

        // Criar um Supabase client com a chave de serviço para ter acesso total
        const supabaseAdminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const daysToCheck = [10, 6, 3, 1];

        for (const days of daysToCheck) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            const formattedTargetDate = targetDate.toISOString().split('T')[0];

            const { data: enrollments, error } = await supabaseAdminClient
                .from('enrollments')
                .select(`
          students ( name, phone_number ),
          modalities ( organizations ( name ) )
        `)
                .eq('expiry_date', formattedTargetDate);

            if (error) throw error;

            for (const enrollment of enrollments) {
                // @ts-ignore: Ignorando o erro de tipo para a estrutura aninhada
                const student = enrollment.students;
                // @ts-ignore: Ignorando o erro de tipo para a estrutura aninhada
                const organizationName = enrollment.modalities?.organizations?.name;
                const to = student?.phone_number;

                if (to && student?.name && organizationName) {
                    const messageBody = messageTemplates[days]
                        .replace('{studentName}', student.name)
                        .replace('{orgName}', organizationName);

                    const messageData = new URLSearchParams({
                        To: `whatsapp:${to}`,
                        From: twilioWhatsAppFrom,
                        Body: messageBody,
                    });

                    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: messageData,
                    });

                    if (!response.ok) {
                        console.error(`Falha ao enviar para ${to}:`, await response.text());
                    } else {
                        console.log(`Mensagem enviada para ${student.name} (${to}) - ${days} dias para vencer.`);
                    }
                }
            }
        }

        return new Response(JSON.stringify({ message: "Verificação de lembretes concluída." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});