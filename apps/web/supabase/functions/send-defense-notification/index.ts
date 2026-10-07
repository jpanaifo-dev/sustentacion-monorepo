// Supabase Edge Function: send-defense-notification
// Sends transactional emails using Resend and records in notifications + audit_logs

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  defense_id: string;
  type: "CONFIRMATION" | "RESCHEDULE" | "CANCELLATION";
  reason?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "posgrado@unapiquitos.edu.pe";

    // Client with service role to read private data and write notifications/audit
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Validate Authorization token from caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotificationPayload = await req.json();
    const { defense_id, type, reason } = body;

    if (!defense_id || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch full defense details
    const { data: defense, error: defenseError } = await supabase
      .from("defenses")
      .select(`
        *,
        unit:units(name, acronym, institutional_email),
        facility:facilities(name, address),
        space:spaces(name, floor, location_reference),
        participants:defense_participants(
          participant_type,
          role,
          person:persons(first_name, last_name, email)
        )
      `)
      .eq("id", defense_id)
      .single();

    if (defenseError || !defense) {
      return new Response(JSON.stringify({ error: "Defense not found", details: defenseError }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect recipient emails
    const recipients: { name: string; email: string; role: string }[] = [];

    // Unit email
    if (defense.unit?.institutional_email) {
      recipients.push({
        name: defense.unit.name,
        email: defense.unit.institutional_email,
        role: "Coordinación",
      });
    }

    // Participants
    if (defense.participants && Array.isArray(defense.participants)) {
      for (const p of defense.participants) {
        if (p.person?.email) {
          recipients.push({
            name: `${p.person.first_name} ${p.person.last_name}`,
            email: p.person.email,
            role: p.participant_type,
          });
        }
      }
    }

    // Remove duplicates
    const uniqueRecipients = recipients.filter((item, index, self) =>
      index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase())
    );

    const emailSubject =
      type === "CONFIRMATION"
        ? `[EPG-UNAP] Sustentación Confirmada: ${defense.code} - ${defense.title.substring(0, 50)}...`
        : type === "RESCHEDULE"
        ? `[EPG-UNAP] REPROGRAMACIÓN: Sustentación ${defense.code}`
        : `[EPG-UNAP] CANCELACIÓN: Sustentación ${defense.code}`;

    const studentNames = (defense.participants || [])
      .filter((p: any) => p.participant_type === "STUDENT")
      .map((p: any) => `${p.person?.first_name} ${p.person?.last_name}`)
      .join(", ") || "No especificado";

    const jurorNames = (defense.participants || [])
      .filter((p: any) => p.participant_type === "JUROR")
      .map((p: any) => `${p.person?.first_name} ${p.person?.last_name} (${p.role || 'Miembro'})`)
      .join("<br/>") || "No especificado";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">ESCUELA DE POSTGRADO - UNAP</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Sistema de Agenda de Sustentaciones</p>
        </div>
        <div style="padding: 24px;">
          <h3 style="color: #0369a1; margin-top: 0;">${emailSubject}</h3>
          <p>Estimado(a) miembro de la comunidad académica,</p>
          <p>Le notificamos sobre el estado de la siguiente sustentación institucional:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold; width: 30%;">Código:</td>
              <td style="padding: 8px;">${defense.code}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Título de Tesis:</td>
              <td style="padding: 8px;">${defense.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Unidad Académica:</td>
              <td style="padding: 8px;">${defense.unit?.name || 'No especificada'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Sustentante(s):</td>
              <td style="padding: 8px;">${studentNames}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Fecha:</td>
              <td style="padding: 8px;">${defense.scheduled_date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Horario:</td>
              <td style="padding: 8px;">${defense.start_time} - ${defense.estimated_end_time}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold;">Modalidad / Lugar:</td>
              <td style="padding: 8px;">
                ${defense.modality}
                ${defense.space?.name ? ` | ${defense.space.name} (${defense.facility?.name})` : ''}
                ${defense.virtual_url ? `<br/><a href="${defense.virtual_url}">${defense.virtual_platform || 'Enlace virtual'}</a>` : ''}
              </td>
            </tr>
            ${reason ? `
            <tr style="border-bottom: 1px solid #e2e8f0; background: #fef2f2;">
              <td style="padding: 8px; font-weight: bold; color: #991b1b;">Motivo / Nota:</td>
              <td style="padding: 8px; color: #991b1b;">${reason}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; font-weight: bold; vertical-align: top;">Jurado Calificador:</td>
              <td style="padding: 8px;">${jurorNames}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #64748b;">
            Por favor, presentarse con 15 minutos de anticipación en el recinto correspondiente o conectarse al enlace virtual provisto.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Universidad Nacional de la Amazonía Peruana — Escuela de Postgrado<br/>
          Iquitos, Loreto, Perú
        </div>
      </div>
    `;

    const sendResults = [];

    // Send emails via Resend or mock in local development
    for (const recipient of uniqueRecipients) {
      let status = "PENDING";
      let messageId: string | null = null;
      let errorMsg: string | null = null;

      if (resendApiKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: resendFromEmail,
              to: [recipient.email],
              subject: emailSubject,
              html: emailHtml,
            }),
          });
          const resData = await res.json();
          if (res.ok) {
            status = "SENT";
            messageId = resData.id;
          } else {
            status = "FAILED";
            errorMsg = JSON.stringify(resData);
          }
        } catch (err: any) {
          status = "FAILED";
          errorMsg = err.message;
        }
      } else {
        // If Resend API Key is not set in development, record simulated success
        status = "SENT";
        messageId = `mock-${Date.now()}`;
      }

      // Record in notifications table
      const { data: notifRecord } = await supabase.from("notifications").insert({
        defense_id: defense.id,
        type,
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        status,
        provider: "resend",
        provider_message_id: messageId,
        error: errorMsg,
        sent_at: status === "SENT" ? new Date().toISOString() : null,
      }).select().single();

      sendResults.push({ recipient: recipient.email, status, error: errorMsg });
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "NOTIFICATION_SENT",
      entity_type: "defense",
      entity_id: defense.id,
      metadata: { type, recipientsCount: uniqueRecipients.length, results: sendResults },
    });

    return new Response(JSON.stringify({ success: true, count: uniqueRecipients.length, results: sendResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
