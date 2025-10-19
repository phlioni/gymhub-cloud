import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { orgName, adminEmail, adminFullName, adminPassword } = await req.json()

    // Create organization
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .insert({ name: orgName })
      .select()
      .single()

    if (orgError) throw orgError

    // Create admin user
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: orgData.id,
        full_name: adminFullName,
        role: 'admin',
      }
    })

    if (userError) {
      // Rollback
      await supabaseClient.from('organizations').delete().eq('id', orgData.id)
      throw userError
    }

    // After creating the user, insert into public.profiles
    if (userData.user) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userData.user.id,
          organization_id: orgData.id,
          full_name: adminFullName,
          role: 'admin'
        });

      if (profileError) {
        // More complex rollback would be needed here in a real-world scenario
        // For now, we'll just throw the error
        throw profileError;
      }
    }


    return new Response(
      JSON.stringify({ success: true, organization: orgData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})