import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- Ferramentas que a IA pode usar ---
const tools = [
    {
        type: 'function',
        function: {
            name: 'get_modalities',
            description: 'Obtém a lista de modalidades e preços da academia.'
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_appointments',
            description: 'Obtém os próximos agendamentos do aluno.'
        }
    },
    {
        type: 'function',
        function: {
            name: 'initiate_check_in',
            description: 'Inicia o processo de check-in para o aluno, perguntando se ele confirma a ação.'
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_today_workout',
            description: 'Busca e formata o treino do dia para o aluno.'
        }
    }
];
// --- Função para chamar a IA (OpenAI) ---
async function getAiResponse(userMessage, context, apiKey) {
    if (!apiKey) throw new Error("A chave da API da OpenAI (OPENAI_API_KEY) não está configurada nos secrets do Supabase.");
    const systemPrompt = `Você é a "TreineAI" 🤖, a assistente virtual da academia. Sua personalidade é simpática, motivadora e prestativa. Você adora usar emojis para deixar a conversa mais animada.
    Sua principal função é identificar a intenção do aluno e usar uma de suas ferramentas ('tools') para executar a ação.

    Regras Importantes:
    1.  **Nome:** Seu nome é TreineAI.
    2.  **Ação é Prioridade:** Se a mensagem do usuário corresponder a uma de suas ferramentas (como "checkin", "meu treino", "horários"), priorize chamar a ferramenta.
    3.  **Respostas Gerais:** Para saudações ("oi", "olá") ou perguntas que não são ações, responda de forma amigável, se apresente e pergunte como pode ajudar.
    4.  **Limites:** Se o usuário pedir algo que você não pode fazer (ex: "cancelar meu plano"), informe de forma educada que essa ação deve ser feita na recepção.
    5.  **Contexto:** Use o contexto para saber o nome do aluno e da academia para personalizar suas respostas.

    --- CONTEXTO ATUAL ---
    ${context}
    --- FIM DO CONTEXTO ---
    `;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            tools: tools,
            tool_choice: 'auto'
        })
    });
    if (!response.ok) {
        const errorBody = await response.json();
        console.error("Erro na API da OpenAI:", errorBody);
        throw new Error(`Erro na API da OpenAI: ${errorBody.error.message}`);
    }
    const data = await response.json();
    return data.choices[0].message;
}
// --- Funções de Ação do Webhook ---
const actions = {
    get_modalities: async (supabase, organization_id) => {
        const { data: modalities } = await supabase.from('modalities').select('name, price').eq('organization_id', organization_id);
        if (!modalities || modalities.length === 0) return 'Ops! Parece que ainda não temos modalidades cadastradas. Volte em breve! 😉';
        return 'Legal! 🎉 Nossas modalidades e preços são:\n\n' + modalities.map((m) => `*${m.name}*: R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : 'Consulte'}`).join('\n');
    },
    get_appointments: async (supabase, studentId) => {
        const { data: appointments } = await supabase.from('appointments').select('start_time, modalities(name)').eq('student_id', studentId).gte('start_time', new Date().toISOString()).order('start_time').limit(5);
        if (!appointments || appointments.length === 0) return 'Você não possui agendamentos futuros. Que tal marcar um? 😉';
        return 'Ok, aqui estão seus próximos agendamentos:\n\n' + appointments.map((a) => {
            const date = new Date(a.start_time);
            const formattedDate = `${date.toLocaleDateString('pt-BR', {
                timeZone: 'America/Sao_Paulo'
            })} às ${date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            })}`;
            return `🗓️ *${formattedDate}* - ${a.modalities?.name || 'Aula Particular'}`;
        }).join('\n');
    },
    initiate_check_in: async (supabase, organization_id) => {
        const { data: org } = await supabase.from('organizations').select('name').eq('id', organization_id).single();
        if (!org) throw new Error("Organização não encontrada para o check-in.");
        return `Confirma o check-in na ${org.name} hoje? (Responda *Sim* ou *Não*)`;
    },
    get_today_workout: async (supabase, student) => {
        const now = new Date();
        const brazilTime = new Date(now.toLocaleString('en-US', {
            timeZone: 'America/Sao_Paulo'
        }));
        const dayOfWeekForQuery = brazilTime.getDay() === 0 ? 7 : brazilTime.getDay();
        const { data: workouts, error } = await supabase.rpc('get_student_workouts', {
            p_student_id: student.id,
            p_organization_id: student.organization_id
        });
        if (error) throw error;
        const todayWorkouts = workouts.filter((w) => {
            const frequency = w.frequency?.toLowerCase();
            if (w.day_of_week) return w.day_of_week == dayOfWeekForQuery;
            if ([
                'diário',
                'único',
                'daily',
                'single'
            ].includes(frequency)) return true;
            return false;
        });
        if (todayWorkouts.length === 0) return 'Ebaa, hoje é seu dia de descanso! Nenhum treino específico para você hoje. Aproveite! 🏖️';
        let workoutsText = 'Bora treinar! 💪 Aqui está seu treino para hoje:\n';
        todayWorkouts.forEach((workout) => {
            workoutsText += `\n*${workout.name}*\n`;
            if (workout.description) workoutsText += `_${workout.description}_\n\n`;
            if (workout.workout_exercises && workout.workout_exercises.length > 0) {
                workoutsText += 'Exercícios:\n';
                workout.workout_exercises.forEach((ex) => {
                    let exLine = `\n- *${ex.exercise_name}*\n`;
                    const details = [
                        ex.sets && `${ex.sets} séries`,
                        ex.reps && `${ex.reps} reps`,
                        ex.rest_period && `${ex.rest_period}s desc.`
                    ].filter(Boolean);
                    if (details.length > 0) exLine += `  (${details.join(' / ')})\n`;
                    if (ex.observations) exLine += `  Obs: ${ex.observations}\n`;
                    workoutsText += exLine;
                });
            }
        });
        return workoutsText.trim();
    }
};
// --- Lógica Principal do Webhook ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', {
        headers: corsHeaders
    });
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    try {
        const params = new URLSearchParams(await req.text());
        const from = params.get('From')?.replace('whatsapp:', '');
        const body = params.get('Body')?.trim();
        const lowerCaseBody = body?.toLowerCase() ?? '';
        const createTwiMLResponse1 = (message) => `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        if (!from || !body) return new Response('Parâmetros inválidos.', {
            status: 400
        });
        const { data: student, error: studentError } = await supabaseAdmin.from('students').select('id, name, organization_id').eq('phone_number', from).single();
        if (studentError || !student) {
            const twiml = createTwiMLResponse1("Olá! 👋 Não encontrei seu cadastro. Por favor, verifique se o número está correto ou fale com a recepção, combinado? 😉");
            return new Response(twiml, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                }
            });
        }
        let responseMessage = '';
        let toolCall = null;
        if (lowerCaseBody === 'sim') {
            const { data: org } = await supabaseAdmin.from('organizations').select('id, name').eq('id', student.organization_id).single();
            if (!org) throw new Error("Organização não encontrada.");
            const { data: existingCheckIn } = await supabaseAdmin.from('check_ins').select('id').eq('student_id', student.id).gte('checked_in_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()).limit(1).single();
            if (existingCheckIn) {
                responseMessage = `Opa! Parece que você já fez check-in hoje. Manda bala no treino! 🔥`;
            } else {
                await supabaseAdmin.from('check_ins').insert({
                    student_id: student.id,
                    organization_id: org.id,
                    source: 'WhatsApp'
                });
                responseMessage = `Check-in confirmado na ${org.name}! Bom treino! 💪`;
            }
        } else if (lowerCaseBody === 'não') {
            responseMessage = "Ok, check-in cancelado. Se precisar de algo mais, é só chamar! 👍";
        } else {
            const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', student.organization_id).single();
            const context = `Nome do Aluno: ${student.name}. Nome da Academia: ${org?.name || 'nossa academia'}.`;
            const aiMessage = await getAiResponse(body, context, openaiApiKey);
            if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                toolCall = aiMessage.tool_calls[0].function;
            } else {
                responseMessage = aiMessage.content;
            }
        }
        if (toolCall) {
            switch (toolCall.name) {
                case 'get_modalities':
                    responseMessage = await actions.get_modalities(supabaseAdmin, student.organization_id);
                    break;
                case 'get_appointments':
                    responseMessage = await actions.get_appointments(supabaseAdmin, student.id);
                    break;
                case 'initiate_check_in':
                    responseMessage = await actions.initiate_check_in(supabaseAdmin, student.organization_id);
                    break;
                case 'get_today_workout':
                    responseMessage = await actions.get_today_workout(supabaseAdmin, student);
                    break;
                default:
                    responseMessage = "Não entendi muito bem o que você quis dizer. 🤔 Pode tentar de outra forma?";
            }
        }
        const twiml = createTwiMLResponse1(responseMessage);
        return new Response(twiml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/xml'
            }
        });
    } catch (error) {
        console.error("Erro geral no webhook:", error.message);
        const twiml = createTwiMLResponse("Puxa, tivemos um probleminha técnico por aqui. 🛠️ Nossa equipe já foi avisada. Tente novamente em alguns instantes, por favor!");
        return new Response(twiml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/xml'
            },
            status: 500
        });
    }
});
