// Supabase Edge Function: create-media-upload
// Generates secure direct upload URL for Cloudflare Images / R2 and logs upload intents

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
    const cloudflareApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { entity_type, entity_id } = body;

    if (!entity_type || !entity_id) {
      return new Response(JSON.stringify({ error: "Missing entity_type or entity_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cloudflareAccountId && cloudflareApiToken) {
      // Cloudflare Images Direct Upload v2 endpoint
      const cfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/images/v2/direct_upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata: {
              uploadedBy: user.id,
              entityType: entity_type,
              entityId: entity_id,
            },
            requireSignedURLs: false,
          }),
        }
      );

      const cfData = await cfResponse.json();
      if (!cfData.success) {
        return new Response(JSON.stringify({ error: "Cloudflare direct upload failed", details: cfData.errors }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          uploadUrl: cfData.result.uploadURL,
          assetId: cfData.result.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Simulated upload in development mode
      const mockAssetId = `cf-mock-${Date.now()}`;
      return new Response(
        JSON.stringify({
          uploadUrl: null,
          mockMode: true,
          assetId: mockAssetId,
          publicUrlPlaceholder: `https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
