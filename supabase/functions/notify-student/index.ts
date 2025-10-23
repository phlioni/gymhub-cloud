import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { to, message } = await req.json();

        if (!to || !message) {
            throw new Error("É necessário fornecer 'to' (número de telefone) e 'message'.");
        }

        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioWhatsAppFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

        if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
            throw new Error("As variáveis de ambiente do Twilio não estão configuradas.");
        }

        const messageData = new URLSearchParams({
            To: `whatsapp:${to}`,
            From: `whatsapp:${twilioWhatsAppFrom.replace('whatsapp:', '')}`,
            Body: message,
        });

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: messageData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Falha ao enviar para ${to}:`, errorText);
            throw new Error(`Falha no serviço de mensagens: ${errorText}`);
        }

        return new Response(JSON.stringify({ success: true, message: `Mensagem enviada para ${to}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error("Erro na função notify-student:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});