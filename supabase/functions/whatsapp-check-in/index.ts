import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const GREETING_MESSAGE = (studentName) => `Olá, ${studentName}! Sou a ArIA 🤖, sua assistente virtual fitness.

Comigo você pode:
1️⃣ Ver as *modalidades e preços*
2️⃣ Checar seus *próximos agendamentos*
3️⃣ Fazer seu *check-in*
4️⃣ Pedir seu *treino do dia*
🎯 Definir um *novo objetivo* (ex: "quero perder peso")

É só me dizer o que precisa ou mandar o número da opção!`;
const actions = {
    get_modalities: async (supabase, organization_id) => {
        const { data: modalities } = await supabase.from('modalities').select('name, price').eq('organization_id', organization_id);
        if (!modalities || modalities.length === 0) return 'Ops! Parece que ainda não temos modalidades cadastradas. Volte em breve! 😉';
        return 'Legal! 🎉 Nossas modalidades e preços são:\n\n' + modalities.map((m) => `*${m.name}*: R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : 'Consulte'}`).join('\n');
    },
    get_appointments: async (supabase, student) => {
        const { data: appointments } = await supabase.from('appointments').select('start_time, modalities(name)').eq('student_id', student.id).gte('start_time', new Date().toISOString()).order('start_time').limit(5);
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
    initiate_check_in: async (supabase, student) => {
        const { data: studentOrgs, error } = await supabase.from('enrollments').select('students!inner(id), modalities!inner(organization_id, organizations!inner(name))').eq('students.id', student.id);
        if (error || !studentOrgs || studentOrgs.length === 0) {
            throw new Error("Não foi possível encontrar sua matrícula para o check-in.");
        }
        const uniqueOrgs = [
            ...new Map(studentOrgs.map((item) => [
                item.modalities.organizations.name,
                item.modalities
            ])).values()
        ];
        if (uniqueOrgs.length === 1) {
            return `Confirma o check-in na ${uniqueOrgs[0].organizations.name} hoje? (Responda *Sim* ou *Não*)`;
        }
        let message = 'Notei que você está matriculado em mais de um local. Onde você gostaria de fazer o check-in hoje?\n\n';
        uniqueOrgs.forEach((org, index) => {
            message += `${index + 1}. *${org.organizations.name}*\n`;
        });
        message += '\nResponda com o número do local desejado.';
        return message;
    },
    get_today_workout: async (supabase, student) => {
        const { data: workouts, error } = await supabase.rpc('get_student_workouts', {
            p_student_id: student.id,
            p_organization_id: student.organization_id
        });
        if (error) throw error;
        if (!workouts || workouts.length === 0) {
            return 'Você ainda não tem um treino associado. Fale com seu instrutor ou defina um objetivo comigo para começarmos! 🚀';
        }
        const today = new Date();
        const userTimezone = "America/Sao_Paulo"; // Timezone do Brasil
        const todayInTimezone = new Date(today.toLocaleString("en-US", {
            timeZone: userTimezone
        }));
        let dayOfWeek = todayInTimezone.getDay();
        if (dayOfWeek === 0) {
            dayOfWeek = 7;
        }
        const todaysWorkouts = workouts.filter((workout) => {
            if (workout.frequency === 'weekly' || workout.frequency === 'single') {
                return true;
            }
            if (workout.frequency === 'daily' && workout.day_of_week === dayOfWeek) {
                return true;
            }
            return false;
        });
        if (todaysWorkouts.length === 0) {
            return 'Ótimo que você está aqui! 🎉 Nenhum treino específico para hoje. Que tal um treino livre ou uma conversa com seu instrutor?';
        }
        let workoutsText = 'Bora treinar! 💪 Aqui está seu treino para hoje:\n';
        todaysWorkouts.forEach((workout) => {
            workoutsText += `\n*${workout.name}*\n`;
            if (workout.description) workoutsText += `${workout.description.replace(/_/g, '')}\n\n`;
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
    start_goal_conversation: async (supabase, student_phone_number, initial_goal, interaction) => {
        const existingDetails = interaction.goal_details;
        if (existingDetails && existingDetails.weight && existingDetails.height && existingDetails.activity_level) {
            await supabase.from('student_coach_interactions').update({
                conversation_state: 'confirming_info',
                goal_details: {
                    ...existingDetails,
                    objective_text: initial_goal
                }
            }).eq('student_phone_number', student_phone_number);
            return `Legal! Para o seu objetivo de "${initial_goal}", já tenho algumas informações:\n\n- Peso: *${existingDetails.weight} kg*\n- Altura: *${existingDetails.height} cm*\n- Nível de Atividade: *${existingDetails.activity_level}*\n\nQuer usar esses dados ou prefere *atualizar*?`;
        } else {
            await supabase.from('student_coach_interactions').update({
                conversation_state: 'gathering_info',
                goal_details: {
                    objective_text: initial_goal
                }
            }).eq('student_phone_number', student_phone_number);
            return `Que legal que você quer focar em "${initial_goal}"! Para montarmos o plano ideal, preciso de algumas informações.\n\nPor favor, me diga seu **peso (em kg)**, sua **altura (em cm)**, e seu **nível de atividade** (ex: sedentário, 3x por semana, etc.).`;
        }
    },
    generate_plan_suggestion: async (supabase, student_phone_number, goal_details) => {
        const plan_suggestion = {
            generated_plan: `Sugestão:\n- Musculação 4x/semana (ABC + Perna)\n- Dieta de 2800kcal (40% Carbo, 30% Prot, 30% Gord)\n- Foco em supino, agachamento e remada.`
        };
        await supabase.from('student_coach_interactions').update({
            conversation_state: 'awaiting_plan_validation',
            goal_details: goal_details,
            plan_suggestion: plan_suggestion
        }).eq('student_phone_number', student_phone_number);
        return "Excelente! Com base nas suas informações, preparei uma sugestão de plano. Enviei para o seu personal/academia para validação. Assim que aprovarem, eu te aviso por aqui e começamos juntos essa jornada! 🚀";
    }
};
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
            description: 'Inicia uma conversa para definir um novo plano de treino e dieta. Requer o objetivo inicial do usuário como argumento.',
            parameters: {
                type: "object",
                properties: {
                    "initial_goal": {
                        type: "string",
                        description: "O objetivo que o usuário declarou, ex: 'perder peso'."
                    }
                },
                required: [
                    "initial_goal"
                ]
            }
        }
    }
];
async function getAiResponse(userMessage, context, apiKey) {
    if (!apiKey) throw new Error("A chave da API da OpenAI não está configurada.");
    const systemPrompt = `Você é "ArIA", uma assistente virtual fitness. Sua personalidade é simpática e motivadora. Use emojis.
    Sua missão é entender a intenção do aluno e usar suas 'tools' para ajudar. Seja direta e use as ferramentas sempre que possível.
    Se o usuário mencionar um objetivo (ex: "perder peso", "ganhar massa"), use 'start_goal_conversation'.

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
const parseGoalDetails = (text) => {
    const weightMatch = text.match(/(\d{2,3}(?:[.,]\d{1,2})?)\s*kg/i);
    const heightMatch = text.match(/(\d{2,3})\s*cm/i);
    const activityMatch = text.match(/(sedent[áa]rio|(\d+)\s*x|\d+\s*vezes|diariamente|todos os dias)/i);
    let activity_level = 'N/A';
    if (activityMatch) {
        if (activityMatch[1].toLowerCase().includes('sedent')) {
            activity_level = 'Sedentário';
        } else if (activityMatch[2]) {
            activity_level = `${activityMatch[2]}x por semana`;
        } else {
            activity_level = activityMatch[1];
        }
    }
    return {
        weight: weightMatch ? weightMatch[1].replace(',', '.') : 'N/A',
        height: heightMatch ? heightMatch[1] : 'N/A',
        activity_level: activity_level
    };
};
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', {
        headers: corsHeaders
    });
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    try {
        const params = new URLSearchParams(await req.text());
        const from = params.get('From')?.replace('whatsapp:', '');
        const body = params.get('Body')?.trim();
        const mediaUrl = params.get('MediaUrl0');
        const numMedia = parseInt(params.get('NumMedia') || '0', 10);
        const lowerCaseBody = body?.toLowerCase() ?? '';
        const createTwiMLResponse1 = (message) => `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        if (!from) return new Response('Parâmetros inválidos.', {
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
        if (numMedia > 0 && mediaUrl) {
            // ... (código de upload de imagem permanece o mesmo)
        } else if (interaction.conversation_state === 'gathering_info' && body) {
            const parsedDetails = parseGoalDetails(body);
            const goal_details = {
                ...interaction.goal_details,
                ...parsedDetails
            };
            if (parsedDetails.weight && parsedDetails.weight !== 'N/A') {
                await supabaseAdmin.from('student_history').insert({
                    student_id: student.id,
                    organization_id: student.organization_id,
                    event_type: 'weight_log',
                    notes: `Aluno registrou novo peso: ${parsedDetails.weight} kg`,
                    metadata: {
                        weight: parsedDetails.weight
                    }
                });
            }
            responseMessage = await actions.generate_plan_suggestion(supabaseAdmin, from, goal_details);
            await supabaseAdmin.from('student_history').insert({
                student_id: student.id,
                organization_id: student.organization_id,
                event_type: 'goal_set',
                notes: `Aluno definiu novo objetivo: ${goal_details.objective_text}`,
                metadata: goal_details
            });
        } else if (interaction.conversation_state === 'confirming_info' && body) {
            if (lowerCaseBody.includes('usar')) {
                responseMessage = await actions.generate_plan_suggestion(supabaseAdmin, from, interaction.goal_details);
            } else {
                await supabaseAdmin.from('student_coach_interactions').update({
                    conversation_state: 'gathering_info'
                }).eq('student_phone_number', from);
                responseMessage = `Ok, vamos atualizar! Por favor, me diga novamente seu **peso (em kg)**, sua **altura (em cm)**, e seu **nível de atividade atual**.`;
            }
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
        } else if (body) {
            const { data: org } = await supabaseAdmin.from('organizations').select('name').eq('id', student.organization_id).single();
            const context = `Nome do Aluno: ${student.name}. Academia: ${org?.name || 'nossa academia'}.`;
            const aiMessage = await getAiResponse(body, context, openaiApiKey);
            if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                toolCall = aiMessage.tool_calls[0].function;
            } else if (aiMessage.content) {
                responseMessage = aiMessage.content;
            } else {
                responseMessage = GREETING_MESSAGE(student.name);
            }
        } else {
            responseMessage = GREETING_MESSAGE(student.name);
        }
        if (toolCall) {
            const actionFn = actions[toolCall.name];
            if (actionFn) {
                if (toolCall.name === 'start_goal_conversation') {
                    const args = JSON.parse(toolCall.arguments || '{}');
                    responseMessage = await actions.start_goal_conversation(supabaseAdmin, from, args.initial_goal, interaction);
                } else {
                    responseMessage = await actionFn(supabaseAdmin, student);
                }
            } else {
                responseMessage = "Não entendi o que você quis dizer. 🤔 Pode tentar de outra forma?";
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
