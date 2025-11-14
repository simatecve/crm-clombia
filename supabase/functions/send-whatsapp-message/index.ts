import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensaje, numero_c, numero_w, tipo_mensaje, sentid } = await req.json();

    console.log('Sending message to webhook:', { mensaje, numero_c, numero_w });

    // Build query parameters for GET request
    const params = new URLSearchParams({
      mensaje,
      numero_c,
      numero_w,
      tipo_mensaje: tipo_mensaje || "salida",
      sentid: sentid || "sent",
    });

    // Try GET request first (as suggested by webhook)
    const webhookUrl = `https://agentes1111-n8n.vnh08s.easypanel.host/webhook/enviarm_mensaje?${params.toString()}`;
    
    console.log('Calling webhook with GET method:', webhookUrl);

    const webhookResponse = await fetch(webhookUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      throw new Error(`Webhook returned status ${webhookResponse.status}: ${errorText}`);
    }

    const responseData = await webhookResponse.json().catch(() => ({}));
    console.log('Webhook response:', responseData);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-message function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
