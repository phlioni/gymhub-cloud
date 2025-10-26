import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Criar um cliente de administração com a chave de serviço (segura)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Verificar se o chamador é um superadmin
        const userSupabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        const { data: { user } } = await userSupabaseClient.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
        if (profileError || profile?.role !== 'superadmin') {
            throw new Error('Acesso negado. Apenas super administradores podem executar esta ação.');
        }

        // 3. Obter os dados da requisição
        const { userId, activate } = await req.json();
        if (!userId) throw new Error("ID do usuário é obrigatório.");

        // 4. Executar a ação de ativar/desativar
        // CORREÇÃO: Alterado "36500d" para "876000h" (100 anos em horas)
        const banDuration = activate ? 'none' : '876000h';
        const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { ban_duration: banDuration }
        );
        if (adminError) throw adminError;

        // 5. Atualizar nossa tabela de perfis para consistência
        const { error: updateProfileError } = await supabaseAdmin.from('profiles').update({ is_active: activate }).eq('id', userId);
        if (updateProfileError) throw updateProfileError;

        return new Response(JSON.stringify({ success: true, message: `Usuário ${activate ? 'ativado' : 'desativado'} com sucesso.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})