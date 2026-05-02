// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-jwt",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(unsafe: any): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildInviteLink(appBaseUrl: string, token: string, email: string) {
  const inviteUrl = new URL(appBaseUrl);
  inviteUrl.searchParams.set("admin_invite", token);
  inviteUrl.searchParams.set("email", email);
  return inviteUrl.toString();
}

async function sendInviteEmail({
  resendApiKey,
  recipientEmail,
  inviterName,
  inviteLink,
  workspaceName,
}: {
  resendApiKey: string;
  recipientEmail: string;
  inviterName: string;
  inviteLink: string;
  workspaceName: string;
}) {
  const subject = `Join ${workspaceName || `${inviterName}'s workspace`} on PM-Tool`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p><strong>${escapeHtml(inviterName)}</strong> added you to <strong>${escapeHtml(workspaceName)}</strong>.</p>
      <p>Create an account or sign in with the invited email to join this workspace.</p>
      <p>
        <a href="${escapeHtml(inviteLink)}">Accept Invite</a>
      </p>
      <p>${escapeHtml(inviteLink)}</p>
    </div>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "PM-Tool <noreply@pmtool.ai-developer.site>",
      to: recipientEmail,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("APP_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing env variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const userJwtHeader = req.headers.get("x-user-jwt");

    if (!authHeader && !userJwtHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = (
      userJwtHeader ||
      authHeader?.replace("Bearer ", "") ||
      ""
    ).trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Invalid JWT" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { inviteTokens, appBaseUrl } = await req.json();

    if (!Array.isArray(inviteTokens) || inviteTokens.length === 0) {
      throw new Error("inviteTokens required");
    }

    if (!appBaseUrl || typeof appBaseUrl !== "string") {
      throw new Error("appBaseUrl required");
    }

    const inviterId = userData.user.id;
    const inviterName =
      userData.user.user_metadata?.full_name || userData.user.email;

    const { data: invites, error: invitesError } = await supabaseAdmin
      .from("workspace_invites")
      .select("*")
      .in("invite_token", inviteTokens)
      .eq("invited_by", inviterId);

    if (invitesError) throw invitesError;
    if (!invites?.length) throw new Error("No invites found");

    const failures: Array<{ email: string; error: string }> = [];
    let sentCount = 0;

    for (const invite of invites) {
      if (invite.accepted_at) continue;
      if (new Date(invite.expires_at) < new Date()) continue;

      try {
        await sendInviteEmail({
          resendApiKey,
          recipientEmail: invite.invited_email,
          inviterName,
          workspaceName: invite.workspace_name || `${inviterName}'s workspace`,
          inviteLink: buildInviteLink(
            appBaseUrl,
            invite.invite_token,
            invite.invited_email,
          ),
        });
        sentCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown email error";
        console.error(
          `Failed to send admin invite email to ${invite.invited_email}`,
          error,
        );
        failures.push({ email: invite.invited_email, error: message });
      }
    }

    if (failures.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Failed to send ${failures.length} workspace invite email${
            failures.length === 1 ? "" : "s"
          }.`,
          failures,
          sentCount,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
