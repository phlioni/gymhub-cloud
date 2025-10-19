import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- Funções Auxiliares do Twilio ---

// Envia uma mensagem de texto simples (usada para menus, erros, etc.)
async function sendTwilioTextMessage(to, body, twilioConfig) {
    const { twilioAccountSid, twilioAuthToken, twilioWhatsAppFrom } = twilioConfig;
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const data = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${twilioWhatsAppFrom}`,
        Body: body
    });
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    });
    if (!response.ok) {
        console.error(`Falha ao enviar mensagem de texto para ${to}:`, await response.text());
    }
}

// Envia uma MENSAGEM DE TEMPLATE (usada para notificações, como confirmação de check-in)
async function sendTwilioTemplateMessage(to, templateSid, contentVariables, twilioConfig) {
    const { twilioAccountSid, twilioAuthToken, twilioWhatsAppFrom } = twilioConfig;
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const data = new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${twilioWhatsAppFrom}`,
        ContentSid: templateSid,
        ContentVariables: JSON.stringify(contentVariables)
    });
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Falha ao enviar template para ${to}:`, errorBody);
        throw new Error(`Twilio API Error: ${errorBody}`);
    }
}

// --- Lógica Principal do Webhook ---

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const twilioConfig = {
        twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
        twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN'),
        twilioWhatsAppFrom: Deno.env.get('TWILIO_WHATSAPP_FROM'),
        templateSidConfirmation: Deno.env.get('TWILIO_TEMPLATE_SID_CONFIRMATION'), // Template para "Confirma o check-in..."
        templateSidSuccess: Deno.env.get('TWILIO_TEMPLATE_SID_SUCCESS') // Template para "Check-in realizado..."
    };

    const params = new URLSearchParams(await req.text());
    const from = params.get('From')?.replace('whatsapp:', '');
    const body = params.get('Body')?.toLowerCase().trim();

    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

        if (Object.values(twilioConfig).some((v) => !v)) {
            throw new Error("Uma ou mais variáveis de ambiente do Twilio não estão configuradas.");
        }

        if (!from || !body) {
            return new Response('Parâmetros inválidos.', { status: 400 });
        }

        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('id, name, organization_id')
            .eq('phone_number', from)
            .single();

        if (studentError || !student) {
            await sendTwilioTextMessage(from, "Olá! Não encontramos seu cadastro em nosso sistema. Por favor, verifique se o número está correto ou contate a recepção.", twilioConfig);
            return new Response('Aluno não encontrado.', { status: 404 });
        }

        let responseMessage = '';
        const menuText = `Olá, ${student.name}! Sou seu assistente virtual. Como posso te ajudar hoje?\n\n1. *Ver modalidades e preços*\n2. *Meus agendamentos*\n3. *Fazer check-in*\n\nResponda com o número da opção desejada.`;

        // --- Roteamento das Opções do Menu ---

        if (body.includes('olá') || body.includes('oi') || body.includes('menu')) {
            responseMessage = menuText;
        } else if (body.startsWith('1')) {
            // Lógica para buscar modalidades
            const { data: modalities } = await supabaseAdmin
                .from('modalities')
                .select('name, price')
                .eq('organization_id', student.organization_id);

            if (modalities && modalities.length > 0) {
                responseMessage = 'Nossas modalidades e preços são:\n\n' +
                    modalities.map(m => `*${m.name}*: R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : 'N/A'}`).join('\n');
            } else {
                responseMessage = 'Nenhuma modalidade encontrada no momento.';
            }
        } else if (body.startsWith('2')) {
            // Lógica para buscar agendamentos futuros
            const today = new Date().toISOString();
            const { data: appointments } = await supabaseAdmin
                .from('appointments')
                .select('start_time, modalities(name)')
                .eq('student_id', student.id)
                .gte('start_time', today)
                .order('start_time')
                .limit(5);

            if (appointments && appointments.length > 0) {
                responseMessage = 'Seus próximos agendamentos são:\n\n' +
                    appointments.map(a => {
                        const date = new Date(a.start_time);
                        const formattedDate = `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                        return `*${formattedDate}* - ${a.modalities?.name || 'Aula Particular'}`;
                    }).join('\n');
            } else {
                responseMessage = 'Você não possui agendamentos futuros.';
            }
        } else if (body.startsWith('3') || body === 'check-in') {
            // Lógica de Check-in (integrada do seu script)
            const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', student.organization_id).single();
            if (!org) throw new Error("Organização não encontrada para o check-in.");

            await sendTwilioTemplateMessage(from, twilioConfig.templateSidConfirmation, { '1': student.name, '2': org.name }, twilioConfig);

            // Retorna uma resposta vazia para o Twilio, pois a mensagem já foi enviada
            return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });

        } else if (body === 'sim') {
            // Lógica de Confirmação de Check-in
            const { data: org } = await supabaseAdmin.from('organizations').select('id, name').eq('id', student.organization_id).single();
            if (!org) throw new Error("Organização não encontrada para confirmar o check-in.");

            // Verifica check-in existente
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const { data: existingCheckIn, error: checkInError } = await supabaseAdmin.from('appointments').select('id').eq('student_id', student.id).eq('organization_id', org.id).gte('start_time', startOfDay).limit(1).single();

            if (checkInError && checkInError.code !== 'PGRST116') throw checkInError;

            if (existingCheckIn) {
                responseMessage = `Você já realizou um check-in na unidade ${org.name} hoje.`;
            } else {
                // Simula um check-in criando um agendamento para agora.
                const now = new Date();
                const { error: insertError } = await supabaseAdmin.from('appointments').insert({
                    student_id: student.id,
                    organization_id: org.id,
                    start_time: now.toISOString(),
                    end_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // Adiciona 1h de duração
                    status: 'completed',
                    notes: 'Check-in via WhatsApp'
                });
                if (insertError) throw insertError;

                await sendTwilioTemplateMessage(from, twilioConfig.templateSidSuccess, { '1': org.name }, twilioConfig);
                return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
            }
        } else if (body === 'não') {
            responseMessage = "Ok, check-in cancelado.";
        } else {
            responseMessage = `Desculpe, não entendi. Para ver as opções, envie "menu".`;
        }

        // Envia a resposta final como mensagem de texto
        await sendTwilioTextMessage(from, responseMessage, twilioConfig);

        return new Response('ok', { headers: corsHeaders });

    } catch (error) {
        console.error("Erro geral no webhook:", error.message);
        if (from && twilioConfig.twilioAccountSid) {
            await sendTwilioTextMessage(from, "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.", twilioConfig);
        }
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});