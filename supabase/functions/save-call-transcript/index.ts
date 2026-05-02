// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("APP_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase service credentials." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid user." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      callLogId,
      transcript,
      participantIds = [],
      participantNames = {},
    } = await req.json();

    if (!callLogId || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "callLogId and transcript are required." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: callLog, error: callLogError } = await supabaseAdmin
      .from("call_logs")
      .select("id, channel_id, dm_id")
      .eq("id", callLogId)
      .maybeSingle();

    if (callLogError) throw callLogError;
    if (!callLog) {
      return new Response(JSON.stringify({ error: "Call log not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    let isParticipant = false;

    if (callLog.dm_id) {
      const { data: dm, error: dmError } = await supabaseAdmin
        .from("direct_messages")
        .select("user1_id, user2_id")
        .eq("id", callLog.dm_id)
        .maybeSingle();

      if (dmError) throw dmError;
      isParticipant = dm?.user1_id === userId || dm?.user2_id === userId;
    } else if (callLog.channel_id) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("channel_members")
        .select("user_id")
        .eq("channel_id", callLog.channel_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (membershipError) throw membershipError;
      isParticipant = Boolean(membership);
    }

    if (!isParticipant) {
      return new Response(JSON.stringify({ error: "Not allowed." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload = {
      transcript: transcript.trim(),
      summary: null,
      summary_status: "skipped",
    };

    if (Array.isArray(participantIds) && participantIds.length > 0) {
      updatePayload.participant_ids = participantIds;
    }

    if (participantNames && typeof participantNames === "object") {
      updatePayload.participant_names = participantNames;
    }

    const { error: updateError } = await supabaseAdmin
      .from("call_logs")
      .update(updatePayload)
      .eq("id", callLogId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
