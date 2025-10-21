// supabase/functions/whatsapp-check-in/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- Funções Auxiliares do Twilio (sendTwilioTemplateMessage pode ser removida se não for mais usada em outro lugar) ---
async function sendTwilioTemplateMessage(to, templateSid, contentVariables, twilioConfig) {
    // ... (código existente da função sendTwilioTemplateMessage)
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
        return new Response('ok', {
            headers: corsHeaders
        });
    }
    const twilioConfig = {
        twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
        twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN'),
        twilioWhatsAppFrom: Deno.env.get('TWILIO_WHATSAPP_FROM'),
        templateSidConfirmation: Deno.env.get('TWILIO_TEMPLATE_SID_CONFIRMATION')
    };
    const params = new URLSearchParams(await req.text());
    const from = params.get('From')?.replace('whatsapp:', '');
    const body = params.get('Body')?.toLowerCase().trim();
    // Função para criar uma resposta TwiML
    const createTwiMLResponse = (message) => {
        return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
    };
    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        // Manter a verificação das configs essenciais
        if (!twilioConfig.twilioAccountSid || !twilioConfig.twilioAuthToken || !twilioConfig.twilioWhatsAppFrom || !twilioConfig.templateSidConfirmation) {
            throw new Error("Uma ou mais variáveis de ambiente do Twilio não estão configuradas (AccountSid, AuthToken, WhatsAppFrom, templateSidConfirmation).");
        }
        if (!from || !body) {
            return new Response('Parâmetros inválidos.', {
                status: 400
            });
        }
        const { data: student, error: studentError } = await supabaseAdmin.from('students').select('id, name, organization_id').eq('phone_number', from).single();
        if (studentError || !student) {
            const twiml = createTwiMLResponse("Olá! Não encontramos seu cadastro em nosso sistema. Por favor, verifique se o número está correto ou contate a recepção.");
            return new Response(twiml, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                }
            });
        }
        let responseMessage = '';
        const menuText = `Olá, ${student.name}! Sou seu assistente virtual. Como posso te ajudar hoje?\n\n1. *Ver modalidades e preços*\n2. *Meus agendamentos*\n3. *Fazer check-in*\n\nResponda com o número da opção desejada.`;
        // --- Roteamento das Opções do Menu ---
        if (body.includes('olá') || body.includes('oi') || body.includes('menu')) {
            responseMessage = menuText;
        } else if (body.startsWith('1')) {
            const { data: modalities } = await supabaseAdmin.from('modalities').select('name, price').eq('organization_id', student.organization_id);
            if (modalities && modalities.length > 0) {
                responseMessage = 'Nossas modalities e preços são:\n\n' + modalities.map((m) => `*${m.name}*: R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : 'N/A'}`).join('\n');
            } else {
                responseMessage = 'Nenhuma modalidade encontrada no momento.';
            }
        } else if (body.startsWith('2')) {
            const today = new Date().toISOString();
            const { data: appointments } = await supabaseAdmin.from('appointments').select('start_time, modalities(name)').eq('student_id', student.id).gte('start_time', today).order('start_time').limit(5);
            if (appointments && appointments.length > 0) {
                responseMessage = 'Seus próximos agendamentos são:\n\n' + appointments.map((a) => {
                    const date = new Date(a.start_time);
                    const formattedDate = `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}`;
                    return `*${formattedDate}* - ${a.modalities?.name || 'Aula Particular'}`;
                }).join('\n');
            } else {
                responseMessage = 'Você não possui agendamentos futuros.';
            }
        } else if (body.startsWith('3') || body === 'check-in') {
            // Busca apenas o nome da organização para a mensagem de confirmação inicial
            const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', student.organization_id).single();
            if (!org) throw new Error("Organização não encontrada para o check-in.");
            // Usa a API para enviar a mensagem de template DE CONFIRMAÇÃO e retorna uma resposta vazia para o Twilio.
            await sendTwilioTemplateMessage(from, twilioConfig.templateSidConfirmation, {
                '1': student.name,
                '2': org.name
            }, twilioConfig);
            return new Response('<Response></Response>', {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                }
            });
        } else if (body === 'sim') {
            // ---- ALTERAÇÃO AQUI ----
            // Busca mais dados da organização para a mensagem final
            const { data: org, error: orgError } = await supabaseAdmin.from('organizations').select('id, name, owner_name, organization_type') // <-- Adiciona owner_name e organization_type
                .eq('id', student.organization_id).single();
            if (orgError || !org) throw new Error("Organização não encontrada para confirmar o check-in.");
            // Verifica check-in existente
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const { data: existingCheckIn, error: checkInError } = await supabaseAdmin.from('check_ins').select('id').eq('student_id', student.id).gte('checked_in_at', startOfDay).limit(1).single();
            if (checkInError && checkInError.code !== 'PGRST116') throw checkInError; // Ignora erro "No rows found"
            if (existingCheckIn) {
                responseMessage = `Você já realizou um check-in ${org.organization_type === 'Personal Trainer' ? `com o personal ${org.owner_name || org.name}` : `na unidade ${org.name}`} hoje.`;
            } else {
                // Insere o check-in
                const { error: insertError } = await supabaseAdmin.from('check_ins').insert({
                    student_id: student.id,
                    organization_id: org.id
                });
                if (insertError) throw insertError;
                // Constrói a mensagem de sucesso dinamicamente
                if (org.organization_type === 'Personal Trainer') {
                    responseMessage = `Check-in realizado com sucesso com o personal ${org.owner_name || org.name}! Bom treino! 💪`;
                } else {
                    responseMessage = `Check-in realizado com sucesso na unidade ${org.name}! Bom treino! 💪`;
                }
                // REMOVIDO: Envio do template de sucesso via API
                // await sendTwilioTemplateMessage(from, twilioConfig.templateSidSuccess, {'1': org.name}, twilioConfig);
                // IMPORTANTE: Agora, não retornamos mais uma resposta vazia.
                // A mensagem será enviada pela resposta TwiML no final do try block.
            }
            // ---- FIM DA ALTERAÇÃO ----
        } else if (body === 'não') {
            responseMessage = "Ok, check-in cancelado.";
        } else {
            responseMessage = `Desculpe, não entendi. Para ver as opções, envie "menu".\n\n${menuText}`; // Adiciona o menu em caso de erro
        }
        // Responde diretamente com TwiML para todas as mensagens (exceto a confirmação inicial do check-in)
        const twiml = createTwiMLResponse(responseMessage);
        return new Response(twiml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/xml'
            }
        });
    } catch (error) {
        console.error("Erro geral no webhook:", error.message);
        // Tenta enviar uma mensagem de erro genérica se possível
        if (from && twilioConfig.twilioAccountSid) {
            const twiml = createTwiMLResponse("Ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente mais tarde ou contate o suporte.");
            return new Response(twiml, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                },
                status: 500
            });
        }
        // Se não conseguir nem enviar TwiML, retorna erro JSON
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
