// supabase/functions/whatsapp-check-in/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Função auxiliar para formatar o treino em texto
// Adicionada função auxiliar para formatar o treino
function formatWorkoutForWhatsapp(workout: any): string {
    if (!workout || !workout.workout_exercises || workout.workout_exercises.length === 0) {
        return "Nenhum treino encontrado ou ele está sem exercícios.";
    }

    let message = `*${workout.name}*\n`;
    if (workout.description) {
        message += `_${workout.description}_\n`;
    }
    message += "\n";

    // Ordena os exercícios pela order_index
    const sortedExercises = workout.workout_exercises.sort((a: any, b: any) => a.order_index - b.order_index);

    sortedExercises.forEach((ex: any, index: number) => {
        message += `*${index + 1}. ${ex.exercise_name}*\n`;
        if (ex.sets || ex.reps) {
            message += `   Séries: ${ex.sets || 'N/A'} | Reps: ${ex.reps || 'N/A'}\n`;
        }
        if (ex.rest_period) {
            message += `   Descanso: ${ex.rest_period}\n`;
        }
        if (ex.observations) {
            message += `   Obs: ${ex.observations}\n`;
        }
        message += "\n"; // Espaço entre exercícios
    });

    return message.trim(); // Remove espaços extras no final
}


// --- Lógica Principal do Webhook ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const twilioConfig = {
        twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID'),
        twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN'),
        twilioWhatsAppFrom: Deno.env.get('TWILIO_WHATSAPP_FROM')
    };

    const params = new URLSearchParams(await req.text());
    const from = params.get('From')?.replace('whatsapp:', '');
    const body = params.get('Body')?.toLowerCase().trim();

    const createTwiMLResponse = (message: string) => {
        const escapedMessage = message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapedMessage}</Message></Response>`;
    };

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (!twilioConfig.twilioAccountSid || !twilioConfig.twilioAuthToken || !twilioConfig.twilioWhatsAppFrom) {
            throw new Error("Variáveis de ambiente do Twilio não configuradas.");
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
            const twiml = createTwiMLResponse("Olá! Não encontramos seu cadastro. Verifique o número ou contate a recepção.");
            return new Response(twiml, { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });
        }

        let responseMessage = '';
        // <<< 1. ATUALIZAR MENU TEXT >>>
        const menuText = `Olá, ${student.name}! Como posso te ajudar?\n\n1. *Modalidades e Preços*\n2. *Meus Agendamentos*\n3. *Fazer Check-in*\n4. *Ver meu Treino*\n\nResponda com o número.`;

        if (body.includes('olá') || body.includes('oi') || body === 'menu') {
            responseMessage = menuText;
        } else if (body.startsWith('1')) {
            const { data: modalities } = await supabaseAdmin.from('modalities').select('name, price').eq('organization_id', student.organization_id);
            if (modalities && modalities.length > 0) {
                responseMessage = 'Nossas modalidades e preços são:\n\n' + modalities.map((m) => `*${m.name}*: R$ ${m.price ? m.price.toFixed(2).replace('.', ',') : 'N/A'}`).join('\n');
            } else {
                responseMessage = 'Nenhuma modalidade encontrada no momento.';
            }
        } else if (body.startsWith('2')) {
            const today = new Date().toISOString();
            const { data: appointments } = await supabaseAdmin
                .from('appointments')
                .select('start_time, modalities(name)')
                .eq('student_id', student.id)
                .gte('start_time', today)
                .order('start_time')
                .limit(5);

            if (appointments && appointments.length > 0) {
                responseMessage = 'Seus próximos agendamentos:\n\n' + appointments.map((a) => {
                    const date = new Date(a.start_time);
                    const formattedDate = `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                    return `*${formattedDate}* - ${a.modalities?.name || 'Aula Particular'}`;
                }).join('\n');
            } else {
                responseMessage = 'Você não possui agendamentos futuros.';
            }
        } else if (body.startsWith('3') || body === 'check-in') {
            const { data: org, error: orgErr } = await supabaseAdmin.from('organizations').select('name').eq('id', student.organization_id).single();
            if (orgErr || !org) throw new Error("Organização não encontrada.");
            responseMessage = `Confirma o check-in na ${org.name} hoje? (Sim/Não)`;
        } else if (body === 'sim') {
            const { data: org, error: orgError } = await supabaseAdmin.from('organizations').select('id, name').eq('id', student.organization_id).single();
            if (orgError || !org) throw new Error("Organização não encontrada.");

            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const { data: existingCheckIn, error: checkInError } = await supabaseAdmin.from('check_ins').select('id').eq('student_id', student.id).gte('checked_in_at', startOfDay).limit(1).single();

            if (checkInError && checkInError.code !== 'PGRST116') throw checkInError;

            if (existingCheckIn) {
                responseMessage = `Você já fez check-in na ${org.name} hoje.`;
            } else {
                const { error: insertError } = await supabaseAdmin.from('check_ins').insert({
                    student_id: student.id,
                    organization_id: org.id,
                    source: 'WhatsApp' // Adiciona a origem
                });
                if (insertError) throw insertError;
                responseMessage = `Check-in na ${org.name} realizado! Bom treino! 💪`;
            }
        } else if (body === 'não') {
            responseMessage = "Ok, check-in cancelado.";

            // <<< 2. ADICIONAR LÓGICA PARA OPÇÃO 4 >>>
        } else if (body.startsWith('4') || body.includes('treino')) {
            responseMessage = "Buscando seu treino..."; // Mensagem provisória

            // Tenta buscar treino específico do aluno
            const { data: studentWorkout, error: studentWorkoutError } = await supabaseAdmin
                .from('workouts')
                .select(`*, workout_exercises ( * )`)
                .eq('organization_id', student.organization_id)
                .eq('student_id', student.id)
                .order('created_at', { ascending: false }) // Pega o mais recente específico
                .limit(1)
                .single();

            if (studentWorkoutError && studentWorkoutError.code !== 'PGRST116') { // Ignora 'No rows found'
                console.error("Erro ao buscar treino específico:", studentWorkoutError);
                responseMessage = "Não consegui buscar seu treino específico no momento.";
            } else if (studentWorkout) {
                responseMessage = formatWorkoutForWhatsapp(studentWorkout);
            } else {
                // Se não achou específico, busca o treino geral mais recente
                const { data: generalWorkout, error: generalWorkoutError } = await supabaseAdmin
                    .from('workouts')
                    .select(`*, workout_exercises ( * )`)
                    .eq('organization_id', student.organization_id)
                    .eq('target_type', 'general')
                    .order('created_at', { ascending: false }) // Pega o mais recente geral
                    .limit(1)
                    .single();

                if (generalWorkoutError && generalWorkoutError.code !== 'PGRST116') {
                    console.error("Erro ao buscar treino geral:", generalWorkoutError);
                    responseMessage = "Não consegui buscar o treino geral no momento.";
                } else if (generalWorkout) {
                    responseMessage = formatWorkoutForWhatsapp(generalWorkout);
                } else {
                    responseMessage = "Nenhum treino encontrado para você ou geral.";
                }
            }
            // <<< FIM DA LÓGICA OPÇÃO 4 >>>

        } else {
            responseMessage = `Desculpe, não entendi "${body}". Envie "menu" para ver as opções.\n\n${menuText}`;
        }

        const twiml = createTwiMLResponse(responseMessage);
        return new Response(twiml, { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });

    } catch (error) {
        console.error("Erro geral no webhook:", error.message);
        if (from) {
            const twiml = createTwiMLResponse("Ocorreu um erro. Tente novamente mais tarde.");
            return new Response(twiml, { headers: { ...corsHeaders, 'Content-Type': 'text/xml' }, status: 500 });
        }
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
});