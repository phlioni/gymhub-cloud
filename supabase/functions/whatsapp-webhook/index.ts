import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Resposta padrão do bot com o menu de opções corrigido
const BOT_RESPONSE_MENU = `Olá! Sou seu assistente virtual da GymHub. Como posso te ajudar hoje?

1. *Ver modalidades e preços*
2. *Meus agendamentos*
3. *Fazer check-in*

Responda com o número da opção desejada.`;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseAdminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Extrai os dados da requisição do Twilio
        const params = new URLSearchParams(await req.text());
        const from = params.get('From')?.replace('whatsapp:', '');
        const body = params.get('Body')?.toLowerCase().trim();

        if (!from || !body) {
            throw new Error("Requisição inválida: 'From' ou 'Body' não encontrados.");
        }

        // Busca o aluno pelo número de telefone
        const { data: student, error: studentError } = await supabaseAdminClient
            .from('students')
            .select('id, name, organization_id')
            .eq('phone_number', from)
            .single();

        if (studentError || !student) {
            // Se não encontrar o aluno, envia uma mensagem padrão.
            // Isso evita erros caso alguém que não é aluno mande mensagem.
            const genericResponse = new URLSearchParams();
            genericResponse.append('To', `whatsapp:${from}`);
            genericResponse.append('From', params.get('To')!);
            genericResponse.append('Body', "Olá! Para usar nossos serviços, seu número precisa estar cadastrado por um de nossos administradores.");

            return new Response(genericResponse.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                status: 200,
            });
        }

        let responseMessage = '';

        // Lógica de resposta do bot
        if (body.includes('olá') || body.includes('oi')) {
            responseMessage = BOT_RESPONSE_MENU;
        } else if (body.startsWith('1')) {
            // Lógica para buscar modalidades (exemplo)
            const { data: modalities } = await supabaseAdminClient
                .from('modalities')
                .select('name, price')
                .eq('organization_id', student.organization_id);

            if (modalities && modalities.length > 0) {
                responseMessage = 'Nossas modalidades e preços são:\n\n' +
                    modalities.map(m => `*${m.name}*: R$ ${m.price || 'N/A'}`).join('\n');
            } else {
                responseMessage = 'Nenhuma modalidade encontrada no momento.';
            }
        } else {
            // Futuras implementações para outras opções do menu podem ser adicionadas aqui
            responseMessage = `Opção inválida. Por favor, responda com um dos números do menu.\n\n${BOT_RESPONSE_MENU}`;
        }

        // Monta a resposta para o Twilio
        const twilioResponse = new URLSearchParams();
        twilioResponse.append('To', `whatsapp:${from}`);
        twilioResponse.append('From', params.get('To')!);
        twilioResponse.append('Body', responseMessage);

        return new Response(twilioResponse.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            status: 200,
        });

    } catch (error) {
        console.error('Erro no webhook:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});