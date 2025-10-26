import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    const { orgName, adminEmail, adminFullName, adminPassword } = await req.json();
    // 1. Verifica se um usuário com este e-mail já existe na tabela auth.users
    const { data: existingUser, error: userSearchError } = await supabaseClient.from('users').select('id').in('email', [
      adminEmail
    ]) // Usar 'in' para consulta na tabela auth.users
      .single();
    // Se a consulta encontrar um usuário (sem erro), significa que o e-mail já existe.
    if (existingUser) {
      throw new Error("Um usuário com este e-mail já está registrado.");
    }

    // 2. Se nenhum usuário existir, prossegue para criar a organização com o período de trial
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 60); // Adiciona 60 dias de trial

    const { data: orgData, error: orgError } = await supabaseClient.from('organizations').insert({
      name: orgName,
      subscription_status: 'trial',
      trial_expires_at: trialExpiresAt.toISOString()
    }).select().single();

    if (orgError) throw orgError;

    // 3. Cria o novo usuário administrador na autenticação
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: orgData.id,
        full_name: adminFullName,
        role: 'admin'
      }
    });

    if (userError) {
      // Se a criação do usuário falhar, desfaz a criação da organização.
      await supabaseClient.from('organizations').delete().eq('id', orgData.id);
      throw userError;
    }

    // Se tudo correu bem, retorna sucesso.
    return new Response(JSON.stringify({
      success: true,
      organization: orgData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});