import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'; // Importar crypto do Deno

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gympass-signature, x-partner-platform' // Adicionar cabeçalhos
};

// --- Função para Verificar Assinatura Gympass (HMAC-SHA1) ---
async function verifyGympassSignature(secret: string, bodyText: string, signatureHeader: string | null): Promise<boolean> {
    if (!signatureHeader) {
        console.error("Assinatura X-Gympass-Signature ausente no cabeçalho.");
        return false;
    }
    // O cabeçalho vem como '0x...' mas a comparação é sem o '0x'
    const receivedSignature = signatureHeader.startsWith('0x') ? signatureHeader.substring(2) : signatureHeader;

    const hmac = createHmac('sha1', secret);
    hmac.update(bodyText);
    const calculatedSignature = hmac.digest('hex').toUpperCase();

    console.log("Calculated Signature (Gympass):", calculatedSignature);
    console.log("Received Signature (Gympass):", receivedSignature);

    // Comparação segura
    if (calculatedSignature.length !== receivedSignature.length) return false;
    let result = 0;
    for (let i = 0; i < calculatedSignature.length; i++) {
        result |= calculatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }
    return result === 0;
}
// ---------------------------------------------

// --- Função para Verificar Assinatura TotalPass (Adicionar se necessário) ---
// async function verifyTotalPassSignature(secret: string, bodyText: string, signatureHeader: string | null): Promise<boolean> {
//   // Implementar lógica de verificação do TotalPass (algoritmo pode ser diferente)
//   console.warn("Verificação de assinatura TotalPass não implementada.");
//   return true; // Simular validade por enquanto
// }
// --------------------------------------------------------------------------


Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders
        });
    }

    const requestBodyText = await req.text();
    const gympassSignature = req.headers.get('X-Gympass-Signature');
    // const totalPassSignature = req.headers.get('X-TotalPass-Signature'); // Exemplo, verificar nome correto do header
    const partnerHeader = req.headers.get('X-Partner-Platform'); // Cabeçalho hipotético

    // Determinar o parceiro (prioriza header explícito, senão tenta pela assinatura)
    let partner: 'Gympass' | 'TotalPass' | null = null;
    if (partnerHeader === 'Gympass' || gympassSignature) {
        partner = 'Gympass';
    } else if (partnerHeader === 'TotalPass' /*|| totalPassSignature*/) { // Descomentar se TotalPass usar assinatura
        partner = 'TotalPass';
    }

    if (!partner) {
        console.error("Não foi possível determinar o parceiro (Gympass/TotalPass) da requisição.");
        return new Response(JSON.stringify({ error: "Parceiro desconhecido." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

        // Obter o segredo correto com base no parceiro
        const webhookSecretEnvVar = `${partner.toUpperCase()}_WEBHOOK_SECRET`;
        const webhookSecret = Deno.env.get(webhookSecretEnvVar);

        if (!webhookSecret) {
            console.error(`Variável de ambiente ${webhookSecretEnvVar} não configurada.`);
            return new Response(JSON.stringify({ error: "Configuração interna do servidor incompleta." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- Verificar Assinatura ---
        let isSignatureValid = false;
        if (partner === 'Gympass') {
            isSignatureValid = await verifyGympassSignature(webhookSecret, requestBodyText, gympassSignature);
        } else if (partner === 'TotalPass') {
            // isSignatureValid = await verifyTotalPassSignature(webhookSecret, requestBodyText, totalPassSignature); // Descomentar e implementar
            console.warn("Lógica de verificação de assinatura para TotalPass não implementada.");
            isSignatureValid = true; // Simular validade por enquanto
        }

        if (!isSignatureValid) {
            console.warn(`Assinatura ${partner} inválida recebida.`);
            return new Response(JSON.stringify({ error: "Assinatura inválida." }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // --- Fim Verificação Assinatura ---

        const payload = JSON.parse(requestBodyText);

        // --- Processamento Específico do Gympass/Wellhub ---
        if (partner === 'Gympass') {
            // Aceita check-in normal (sem booking) E check-in com booking
            const isCheckinEvent = payload.event_type === 'check-in';
            const isCheckinBookingEvent = payload.event_type === 'check-in-booking-occurred';

            if ((!isCheckinEvent && !isCheckinBookingEvent) || !payload.event_data?.user?.unique_token || !payload.event_data?.gym?.id) {
                console.error("Payload do webhook Gympass inválido ou tipo de evento não suportado:", payload);
                throw new Error(`Payload Gympass inválido ou tipo ${payload.event_type} não suportado.`);
            }

            const { event_data } = payload;
            const userToken = event_data.user.unique_token;
            const gymId = event_data.gym.id; // ID numérico da academia
            const studentNameFromWebhook = event_data.user.name;
            const studentEmailFromWebhook = event_data.user.email;

            // 1. Encontrar a Organização pelo ID da Academia (gym.id)
            const { data: organization, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('id, name')
                .eq('gympass_integration_code', gymId) // Comparar com gympass_integration_code (BIGINT)
                .single();

            if (orgError || !organization) {
                console.error(`Organização não encontrada para Gympass ID: ${gymId}`);
                return new Response(JSON.stringify({
                    success: false,
                    message: "Organização não encontrada ou código inválido."
                }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // 2. (REMOVIDO) Validação Externa

            // 3. Encontrar ou Criar/Atualizar o Aluno pelo unique_token
            const tokenColumn = 'gympass_user_token';

            let { data: student, error: studentError } = await supabaseAdmin
                .from('students')
                .select('id, name, email') // Selecionar email também
                .eq('organization_id', organization.id)
                .eq(tokenColumn, userToken)
                .maybeSingle(); // Usar maybeSingle para tratar caso não encontre

            if (studentError) { throw studentError; }

            if (!student) {
                // LÓGICA: CRIA UM NOVO ALUNO
                const studentData = {
                    organization_id: organization.id,
                    name: studentNameFromWebhook || `${partner} Beneficiário ${userToken.substring(0, 4)}`, // Nome mais específico se faltar
                    email: studentEmailFromWebhook || null,
                    [tokenColumn]: userToken,
                    phone_number: null
                };
                const { data: newStudent, error: insertError } = await supabaseAdmin.from('students').insert(studentData).select('id, name').single();
                if (insertError) throw insertError;
                student = newStudent;
                console.log(`Novo aluno ${partner} criado: ${student.name} (ID: ${student.id})`);
            } else {
                // LÓGICA: ATUALIZA ALUNO EXISTENTE
                const updateData: { name?: string; email?: string | null;[key: string]: any } = { [tokenColumn]: userToken };
                let needsUpdate = false;

                if (studentNameFromWebhook && studentNameFromWebhook !== student.name && !studentNameFromWebhook.includes(`${partner} Beneficiário`)) {
                    updateData.name = studentNameFromWebhook;
                    needsUpdate = true;
                }
                if (studentEmailFromWebhook && studentEmailFromWebhook !== student.email) {
                    updateData.email = studentEmailFromWebhook;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    const { error: updateError } = await supabaseAdmin
                        .from('students')
                        .update(updateData)
                        .eq('id', student.id);
                    if (updateError) throw updateError;
                    console.log(`Aluno ${partner} encontrado e atualizado: ${updateData.name || student.name} (ID: ${student.id})`);
                    student.name = updateData.name || student.name;
                } else {
                    console.log(`Aluno ${partner} encontrado: ${student.name} (ID: ${student.id}). Nenhum dado novo para atualizar.`);
                }
            }

            // 4. Inserir Check-in
            const checkInSource = partner;
            const { error: checkInError } = await supabaseAdmin.from('check_ins').insert({
                student_id: student.id,
                organization_id: organization.id,
                source: checkInSource
            });

            if (checkInError) {
                if (checkInError.code === '23505') { // Violação de unicidade (check_ins_student_org_date_unique)
                    console.warn(`Tentativa de check-in duplicado hoje para ${student.name} via ${partner}. Ignorando.`);
                } else {
                    throw checkInError;
                }
            } else {
                console.log(`Check-in de ${student.name} via ${partner} registrado com sucesso.`);
            }

            // Resposta de sucesso OBRIGATÓRIA para o Gympass/Wellhub (2xx)
            return new Response(
                JSON.stringify({ status: "success", message: `Check-in ${partner} processado para ${student.name}.` }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        } else if (partner === 'TotalPass') {
            // --- Processamento Específico do TotalPass ---
            // Adapte esta seção quando tiver a documentação do webhook do TotalPass
            console.warn("Lógica de processamento para webhook TotalPass não implementada.");

            // Exemplo hipotético de como seria (PRECISA AJUSTAR COM DADOS REAIS):
            const userTokenTP = payload.token; // Supondo que o token venha direto no payload
            const integrationCodeTP = payload.integrationCode; // Código alfanumérico
            const studentNameFromWebhookTP = payload.user?.name; // Supondo que venha assim

            // 1. Encontrar Organização
            const { data: organizationTP, error: orgErrorTP } = await supabaseAdmin
                .from('organizations')
                .select('id, name')
                .eq('totalpass_integration_code', integrationCodeTP) // Usar a coluna correta
                .single();

            if (orgErrorTP || !organizationTP) {
                console.error(`Organização não encontrada para TotalPass Code: ${integrationCodeTP}`);
                return new Response(JSON.stringify({ success: false, message: "Organização TotalPass não encontrada." }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // 2. Encontrar ou Criar Aluno
            const tokenColumnTP = 'totalpass_user_token';
            let { data: studentTP, error: studentErrorTP } = await supabaseAdmin
                .from('students')
                .select('id, name')
                .eq('organization_id', organizationTP.id)
                .eq(tokenColumnTP, userTokenTP)
                .maybeSingle();

            if (studentErrorTP) throw studentErrorTP;

            if (!studentTP) {
                const studentDataTP = { organization_id: organizationTP.id, name: studentNameFromWebhookTP || `${partner} Beneficiário`, [tokenColumnTP]: userTokenTP };
                const { data: newStudentTP, error: insertErrorTP } = await supabaseAdmin.from('students').insert(studentDataTP).select('id, name').single();
                if (insertErrorTP) throw insertErrorTP;
                studentTP = newStudentTP;
                console.log(`Novo aluno ${partner} criado: ${studentTP.name}`);
            } else {
                // Atualizar nome se necessário
                if (studentNameFromWebhookTP && studentNameFromWebhookTP !== studentTP.name) {
                    await supabaseAdmin.from('students').update({ name: studentNameFromWebhookTP }).eq('id', studentTP.id);
                    studentTP.name = studentNameFromWebhookTP;
                }
                console.log(`Aluno ${partner} encontrado: ${studentTP.name}`);
            }

            // 3. Inserir Check-in
            const { error: checkInErrorTP } = await supabaseAdmin.from('check_ins').insert({ student_id: studentTP.id, organization_id: organizationTP.id, source: partner });
            if (checkInErrorTP && checkInErrorTP.code !== '23505') throw checkInErrorTP;
            console.log(`Check-in de ${studentTP.name} via ${partner} ${checkInErrorTP ? 'ignorado (duplicado)' : 'registrado'}.`);


            // Simular sucesso por enquanto
            return new Response(
                JSON.stringify({ status: "success", message: `Webhook TotalPass recebido e processado (simulado).` }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        } else {
            throw new Error("Parceiro desconhecido após verificação inicial."); // Segurança extra
        }


    } catch (error) {
        console.error(`Erro no webhook ${partner || 'desconhecido'}: ${error.message}`);
        return new Response(JSON.stringify({
            error: `Erro interno: ${error.message}` // Mensagem mais genérica para o parceiro
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); // Usar 500 para erro interno
    }
});