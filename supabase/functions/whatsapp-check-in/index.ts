import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para enviar MENSAGENS DE TEMPLATE
async function sendTwilioTemplateMessage(to: string, templateSid: string, contentVariables: object, twilioConfig: any) {
    const { twilioAccountSid, twilioAuthToken, twilioWhatsAppFrom } = twilioConfig;
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    const data = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${twilioWhatsAppFrom}`,
        ContentSid: templateSid,
        ContentVariables: JSON.stringify(contentVariables),
    });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Falha ao enviar template para ${to}:`, errorBody);
        throw new Error(`Twilio API Error: ${errorBody}`);
    }
}

// Função para mensagens de texto simples (para erros e instruções)
async function sendTwilioTextMessage(to: string, body: string, twilioConfig: any) {
    const { twilioAccountSid, twilioAuthToken, twilioWhatsAppFrom } = twilioConfig;
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const data = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${twilioWhatsAppFrom}`,
        Body: body,
    });

    await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
    });
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const twilioConfig = {
        twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
        twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN'),
        twilioWhatsAppFrom: Deno.env.get('TWILIO_WHATSAPP_FROM'),
        templateSidConfirmation: Deno.env.get('TWILIO_TEMPLATE_SID_CONFIRMATION'),
        templateSidSuccess: Deno.env.get('TWILIO_TEMPLATE_SID_SUCCESS'),
    };
    const params = new URLSearchParams(await req.text());
    const from = params.get('From')?.replace('whatsapp:', '');

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (Object.values(twilioConfig).some(v => !v)) {
            throw new Error("Uma ou mais variáveis de ambiente do Twilio não estão configuradas.");
        }

        const body = params.get('Body')?.trim();

        if (!from || !body) {
            return new Response('Parâmetros inválidos.', { status: 400 });
        }

        const { data: students, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, name, organization:organizations ( id, name, address )')
            .eq('phone_number', from);

        if (studentError || !students || students.length === 0) {
            await sendTwilioTextMessage(from, "Olá! Não encontramos seu cadastro em nosso sistema. Por favor, verifique se o número está correto ou contate a recepção.", twilioConfig);
            return new Response('Aluno não encontrado.', { status: 404 });
        }

        // NOVO: Função auxiliar para verificar check-in existente
        const checkExistingCheckIn = async (studentId: string, organizationId: string) => {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

            const { data, error } = await supabaseAdmin
                .from('check_ins')
                .select('id')
                .eq('student_id', studentId)
                .eq('organization_id', organizationId)
                .gte('checked_in_at', startOfDay)
                .lt('checked_in_at', endOfDay)
                .single(); // .single() para otimizar, só precisamos saber se existe um

            if (error && error.code !== 'PGRST116') { // PGRST116 é o erro para "nenhuma linha encontrada", o que é bom para nós
                throw error;
            }
            return data; // Retorna o check-in se existir, ou null se não
        };


        if (body.toLowerCase() === 'check-in') {
            if (students.length === 1) {
                const student = students[0];
                const orgName = student.organization?.name;

                if (!student.name || !orgName) {
                    await sendTwilioTextMessage(from, "Desculpe, não conseguimos carregar os dados da sua academia. Por favor, contate o suporte.", twilioConfig);
                    throw new Error(`Dados ausentes para o aluno ID ${student.id}: nome=${student.name}, org=${orgName}`);
                }

                await sendTwilioTemplateMessage(from, twilioConfig.templateSidConfirmation!, { '1': student.name, '2': orgName }, twilioConfig);

            } else {
                let message = "Olá! Vimos que você está matriculado em mais de uma unidade. Em qual delas você gostaria de fazer o check-in?\n\n";
                students.forEach((s, index) => {
                    message += `${index + 1}. ${s.organization?.name}\n`;
                });
                message += "\nResponda com o número da opção desejada.";
                await sendTwilioTextMessage(from, message, twilioConfig);
            }
        } else if (body.toLowerCase() === 'sim' && students.length === 1) {
            const student = students[0];

            if (!student.organization?.id || !student.organization?.name) {
                throw new Error(`ID ou nome da organização ausente para o aluno ${student.id} ao confirmar check-in.`);
            }

            // NOVO: Verifica se já existe um check-in antes de inserir
            const existingCheckIn = await checkExistingCheckIn(student.id, student.organization.id);
            if (existingCheckIn) {
                await sendTwilioTextMessage(from, `Você já realizou um check-in na unidade ${student.organization.name} hoje.`, twilioConfig);
                return new Response('ok', { headers: corsHeaders });
            }

            const { error: checkinError } = await supabaseAdmin.from('check_ins').insert({
                student_id: student.id,
                organization_id: student.organization.id,
            });

            if (checkinError) throw checkinError;

            await sendTwilioTemplateMessage(from, twilioConfig.templateSidSuccess!, { '1': student.organization.name }, twilioConfig);

        } else if (!isNaN(parseInt(body, 10)) && students.length > 1) {
            const choiceIndex = parseInt(body, 10) - 1;
            if (choiceIndex >= 0 && choiceIndex < students.length) {
                const chosenStudent = students[choiceIndex];

                if (!chosenStudent.organization?.id || !chosenStudent.organization?.name) {
                    throw new Error(`ID ou nome da organização ausente para o aluno ${chosenStudent.id} na escolha múltipla.`);
                }

                // NOVO: Verifica se já existe um check-in antes de inserir
                const existingCheckIn = await checkExistingCheckIn(chosenStudent.id, chosenStudent.organization.id);
                if (existingCheckIn) {
                    await sendTwilioTextMessage(from, `Você já realizou um check-in na unidade ${chosenStudent.organization.name} hoje.`, twilioConfig);
                    return new Response('ok', { headers: corsHeaders });
                }

                const { error: checkinError } = await supabaseAdmin.from('check_ins').insert({
                    student_id: chosenStudent.id,
                    organization_id: chosenStudent.organization.id,
                });

                if (checkinError) throw checkinError;

                await sendTwilioTemplateMessage(from, twilioConfig.templateSidSuccess!, { '1': chosenStudent.organization.name }, twilioConfig);
            } else {
                await sendTwilioTextMessage(from, "Opção inválida. Por favor, responda com o número correspondente à unidade.", twilioConfig);
            }
        } else if (body.toLowerCase() === 'não') {
            await sendTwilioTextMessage(from, "Ok, check-in cancelado.", twilioConfig);
        } else {
            await sendTwilioTextMessage(from, 'Olá! Para iniciar, envie "check-in".', twilioConfig);
        }

        return new Response('ok', { headers: corsHeaders });
    } catch (error) {
        console.error(error.message);
        if (from && twilioConfig.twilioAccountSid) {
            await sendTwilioTextMessage(from, "Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente ou contate o suporte.", twilioConfig);
        }
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});