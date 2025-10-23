import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- Funções de Ação do Webhook (Ferramentas da IA) ---
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
    initiate_check_in: async (supabase, studentId) => {
        const { data: studentOrgs, error } = await supabase.from('students').select('organization_id, organizations(name)').eq('id', studentId);
        if (error || !studentOrgs || studentOrgs.length === 0) throw new Error("Não foi possível encontrar sua matrícula.");
        if (studentOrgs.length === 1) {
            return `Confirma o check-in na ${studentOrgs[0].organizations.name} hoje? (Responda *Sim* ou *Não*)`;
        }
        let message = 'Notei que você está matriculado em mais de um local. Onde você gostaria de fazer o check-in hoje?\n\n';
        studentOrgs.forEach((org, index) => {
            message += `${index + 1}. *${org.organizations.name}*\n`;
        });
        message += '\nResponda com o número do local desejado.';
        return message;
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
            if (w.frequency === 'daily' && w.day_of_week === dayOfWeekForQuery) return true;
            if (w.frequency === 'weekly' || w.frequency === 'single') return true; // Simplificado para mostrar treinos semanais/únicos
            return false;
        });
        if (todayWorkouts.length === 0) return 'Ebaa, hoje é seu dia de descanso! Nenhum treino específico para você hoje. Aproveite! 🏖️';
        let workoutsText = 'Bora treinar! 💪 Aqui está seu treino para hoje:\n';
        todayWorkouts.forEach((workout) => {
            workoutsText += `\n*${workout.name}*\n`;
            // >>> CORREÇÃO APLICADA AQUI: Removidos os underscores <<<
            if (workout.description) workoutsText += `${workout.description}\n\n`;
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
    },
    start_goal_conversation: async (supabase, student_phone_number) => {
        await supabase.from('student_coach_interactions').update({
            conversation_state: 'gathering_info'
        }).eq('student_phone_number', student_phone_number);
        return "Que legal que você quer focar nos seus objetivos! Para começarmos, me conte um pouco mais sobre você. Por favor, me diga seu **peso (em kg)**, sua **altura (em cm)**, e seu **nível de atividade** (ex: sedentário, 3x por semana, etc.).";
    },
    generate_plan_suggestion: async (supabase, student_phone_number, goal_details) => {
        const plan_suggestion = {
            generated_plan: "Sugestão da IA: \n- 3x/semana musculação (ABC)\n- Dieta de 2000kcal com foco em proteínas.\n- Aeróbico 30min pós-treino."
        };
        await supabase.from('student_coach_interactions').update({
            conversation_state: 'awaiting_plan_validation',
            goal_details: goal_details,
            plan_suggestion: plan_suggestion
        }).eq('student_phone_number', student_phone_number);
        return "Excelente! Com base nas suas informações, preparei uma sugestão de plano. Enviei para o seu personal/academia para validação. Assim que aprovarem, eu te aviso por aqui e começamos juntos essa jornada! 🚀";
    }
};
// --- Roteamento de Ferramentas da IA ---
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
            description: 'Inicia o processo de check-in para o aluno.'
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_today_workout',
            description: 'Busca o treino do dia para o aluno.'
        }
    },
    {
        type: 'function',
        function: {
            name: 'start_goal_conversation',
            description: 'Inicia uma conversa para definir um novo plano de treino e dieta com base nos objetivos do aluno.'
        }
    }
];
// --- Chamada para a IA (OpenAI) ---
async function getAiResponse(userMessage, context, apiKey) {
    if (!apiKey) throw new Error("A chave da API da OpenAI não está configurada.");
    const systemPrompt = `Você é "ArIA" 🤖, a assistente virtual fitness. Sua personalidade é simpática, motivadora e muito prestativa. Use emojis para tornar a conversa mais leve e animada.
    Sua missão é entender a intenção do aluno e usar uma de suas 'tools' para ajudar.

    Regras Essenciais:
    1.  **Sempre se apresente como ArIA.**
    2.  **Foco na Ação:** Se a mensagem do usuário corresponder a uma ferramenta (como "checkin", "meu treino", "quero um plano novo"), chame a ferramenta correspondente.
    3.  **Conversa sobre Metas:** Se o usuário mencionar que quer atingir um objetivo (ex: "perder peso", "ganhar massa"), use a ferramenta 'start_goal_conversation'.
    4.  **Respostas Gerais:** Para saudações ("oi") ou perguntas que não são ações, responda amigavelmente, se apresente e pergunte como pode ajudar.
    5.  **Limites:** Se pedirem algo que você não pode fazer (ex: "cancelar meu plano"), informe educadamente que essa ação deve ser feita na recepção da academia.

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
        throw new Error(`Erro na API da OpenAI: ${errorBody.error.message}`);
    }
    return (await response.json()).choices[0].message;
}
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
            const twiml = createTwiMLResponse1("Olá! 👋 Sou a ArIA. Não encontrei seu cadastro. Por favor, verifique se o número está correto ou fale com a recepção, combinado? 😉");
            return new Response(twiml, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/xml'
                }
            });
        }
        // Garante que existe uma entrada de interação para o aluno
        let { data: interaction } = await supabaseAdmin.from('student_coach_interactions').select('*').eq('student_phone_number', from).single();
        if (!interaction) {
            const { data: newInteraction } = await supabaseAdmin.from('student_coach_interactions').insert({
                student_phone_number: from,
                student_id: student.id,
                organization_id: student.organization_id
            }).select().single();
            interaction = newInteraction;
        }
        let responseMessage = '';
        let toolCall = null;
        // --- Lógica de Estado da Conversa ---
        if (interaction.conversation_state === 'gathering_info') {
            const goal_details = {
                objective: 'Perder peso',
                weight: '80kg',
                height: '175cm',
                activity_level: '3x semana'
            };
            responseMessage = await actions.generate_plan_suggestion(supabaseAdmin, from, goal_details);
        } else if (lowerCaseBody === 'sim') {
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
            responseMessage = "Ok, ação cancelada. Se precisar de algo mais, é só chamar! 👍";
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
            const actionFn = actions[toolCall.name];
            if (actionFn) {
                responseMessage = await actionFn(supabaseAdmin, toolCall.name === 'start_goal_conversation' ? from : student, toolCall.arguments ? JSON.parse(toolCall.arguments) : {});
            } else {
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
