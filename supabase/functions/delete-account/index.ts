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
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header." }), {
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
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unable to verify the authenticated user." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = userData.user.id;

    const { error: clearMessageDeletesError } = await supabaseAdmin
      .from("messages")
      .update({ deleted_by: null })
      .eq("deleted_by", userId);

    if (clearMessageDeletesError) {
      throw clearMessageDeletesError;
    }

    const { error: clearDmMessageDeletesError } = await supabaseAdmin
      .from("direct_message_messages")
      .update({ deleted_by: null })
      .eq("deleted_by", userId);

    if (clearDmMessageDeletesError) {
      throw clearDmMessageDeletesError;
    }

    try {
      const ownedStorage = supabaseAdmin.schema("storage").from("objects");
      const ownedObjects: Array<{ bucket_id: string; name: string }> = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await ownedStorage
          .select("bucket_id, name")
          .eq("owner_id", userId)
          .range(from, from + pageSize - 1);

        if (error) {
          throw error;
        }

        if (!data?.length) {
          break;
        }

        ownedObjects.push(...data);

        if (data.length < pageSize) {
          break;
        }

        from += pageSize;
      }

      const objectsByBucket = new Map<string, string[]>();

      for (const object of ownedObjects) {
        const paths = objectsByBucket.get(object.bucket_id) ?? [];
        paths.push(object.name);
        objectsByBucket.set(object.bucket_id, paths);
      }

      for (const [bucketId, paths] of objectsByBucket) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(bucketId)
          .remove(paths);

        if (storageError) {
          console.error("Storage cleanup skipped:", storageError);
        }
      }
    } catch (storageCleanupError) {
      console.error("Storage cleanup skipped:", storageCleanupError);
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      throw new Error(
        `profiles delete failed: ${
          profileDeleteError.message ?? JSON.stringify(profileDeleteError)
        }`,
      );
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      throw new Error(
        `auth.admin.deleteUser failed: ${
          deleteUserError.message ?? JSON.stringify(deleteUserError)
        }`,
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Failed to delete account.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
