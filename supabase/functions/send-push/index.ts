// @ts-nocheck

import { serve } from "https://deno.land/std/http/server.ts";
import webpush from "npm:web-push";
import { createClient } from "npm:@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:your@email.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// const isOffline = (profile: any) => {
//   if (!profile) return true;
//   if (!profile.is_signedin) return true;
//   if (!profile.last_seen) return true;
//   return new Date(profile.last_seen).getTime() < Date.now() - 40 * 1000;
// };

function hslToHex(hsl: string): string {
  // Parse "hsl(300, 70%, 50%)" or "hsl(300,70%,50%)"
  const match = hsl.match(/hsl\(\s*(\d+),\s*([\d.]+)%,\s*([\d.]+)%\s*\)/);
  if (!match) return "6366f1"; // fallback

  let h = parseInt(match[1]) / 360;
  let s = parseInt(match[2]) / 100;
  let l = parseInt(match[3]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b]
    .map((x) =>
      Math.round(x * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

const avatarUrl = (
  name: string | null | undefined,
  color: string | null | undefined,
) => {
  const hex = color?.startsWith("hsl")
    ? hslToHex(color)
    : (color ?? "6366f1").replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? "?")}&background=${hex}&color=fff&size=128&rounded=true&bold=true&length=1`;
};

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;
    const table = body.table;

    if (!record) {
      return new Response("No record", { status: 400 });
    }

    let recipients: string[] = [];
    let payload: any = {};

    if (table === "messages") {
      const [{ data: members }, { data: sender }, { data: channel }] =
        await Promise.all([
          supabase
            .from("channel_members")
            .select("user_id")
            .eq("channel_id", record.channel_id),
          supabase
            .from("profiles")
            .select("full_name, avatar_color")
            .eq("id", record.user_id)
            .single(),
          supabase
            .from("channels")
            .select("name, is_private")
            .eq("id", record.channel_id)
            .single(),
        ]);

      recipients =
        members
          ?.filter((r) => r.user_id !== record.user_id)
          .map((r) => r.user_id) || [];

      const isReply = !!record.thread_id;

      payload = {
        title: isReply
          ? `${sender?.full_name ?? "Someone"} replied to your message in ${channel?.is_private ? "🔒" : "#"}${channel?.name}`
          : `${sender?.full_name ?? "Someone"} just added a message in ${channel?.is_private ? "🔒" : "#"}${channel?.name}`,
        body:
          record.content ||
          (record.attachment_url ? "📎 Sent an attachment" : "New message"),
        icon:
          avatarUrl(sender?.full_name, sender?.avatar_color) ||
          "/icons/icon-72.png",
        channel_id: record.channel_id,
        message_id: record.id,
        thread_id: record.thread_id,
        tag: `channel-${record.channel_id}`,
        url: `https://pmtool.ai-developer.site/?channel=${channel?.id}`,
      };
    } else if (table === "direct_message_messages") {
      const { data: dm } = await supabase
        .from("direct_messages")
        .select("user1_id, user2_id")
        .eq("id", record.dm_id)
        .single();

      const { data: sender } = await supabase
        .from("profiles")
        .select("full_name, avatar_color")
        .eq("id", record.user_id)
        .single();

      if (dm) {
        const otherUserId =
          dm.user1_id === record.user_id ? dm.user2_id : dm.user1_id;
        if (otherUserId !== record.user_id) {
          recipients.push(otherUserId);
        }
      }

      const isReply = !!record.thread_id;

      payload = {
        title: isReply
          ? `${sender?.full_name ?? "Someone"} replied to your message`
          : `${sender?.full_name ?? "Someone"} just sent you a message`,
        body:
          record.content ||
          (record.attachment_url ? "📎 Sent an attachment" : "New message"),
        icon:
          avatarUrl(sender?.full_name, sender?.avatar_color) ||
          "/icons/icon-72.png",
        dm_id: record.dm_id,
        message_id: record.id,
        tag: `dm-${record.dm_id}`,
      };
    } else if (table === "message_reactions") {
      let message: any = null;
      let isDM = false;

      const { data: msg } = await supabase
        .from("messages")
        .select("user_id, channel_id")
        .eq("id", record.message_id)
        .maybeSingle();

      if (msg) {
        message = msg;
      } else {
        const { data: dmMsg } = await supabase
          .from("direct_message_messages")
          .select("user_id, dm_id")
          .eq("id", record.message_id)
          .maybeSingle();

        if (dmMsg) {
          message = dmMsg;
          isDM = true;
        }
      }

      if (!message || message.user_id === record.user_id) {
        return new Response("Skip self reaction");
      }

      const [{ data: reactor }, { data: reactionChannel }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_color")
          .eq("id", record.user_id)
          .single(),
        isDM
          ? Promise.resolve({ data: null })
          : supabase
              .from("channels")
              .select("name, is_private")
              .eq("id", message.channel_id)
              .single(),
      ]);

      recipients.push(message.user_id);

      payload = {
        title: "New reaction",
        body: `${reactor?.full_name} reacted ${record.emoji} to your message${
          isDM
            ? ""
            : ` in ${reactionChannel?.is_private ? "🔒" : "#"}${reactionChannel?.name}`
        }`,
        icon:
          avatarUrl(reactor?.full_name, reactor?.avatar_color) ||
          "/icons/icon-72.png",
        message_id: record.message_id,
        channel_id: isDM ? null : message.channel_id,
        dm_id: isDM ? message.dm_id : null,
        tag: `reaction-${record.message_id}`,
      };
    } else if (table === "pinned_messages") {
      const { data: pinner } = await supabase
        .from("profiles")
        .select("full_name, avatar_color")
        .eq("id", record.pinned_by)
        .single();

      if (record.channel_id) {
        const [{ data: members }, { data: channel }] = await Promise.all([
          supabase
            .from("channel_members")
            .select("user_id")
            .eq("channel_id", record.channel_id),
          supabase
            .from("channels")
            .select("name")
            .eq("id", record.channel_id)
            .single(),
        ]);

        recipients =
          members
            ?.filter((r) => r.user_id !== record.pinned_by)
            .map((r) => r.user_id) || [];

        payload = {
          title: `📌 Pinned in ${channel?.is_private ? "🔒" : "#"}${channel?.name}`,
          body: `${pinner?.full_name} just pinned a message`,
          icon:
            avatarUrl(pinner?.full_name, pinner?.avatar_color) ||
            "/icons/icon-72.png",
          channel_id: record.channel_id,
          message_id: record.message_id,
          tag: `pin-${record.channel_id}`,
        };
      }

      if (record.dm_id) {
        const { data: dm } = await supabase
          .from("direct_messages")
          .select("user1_id, user2_id")
          .eq("id", record.dm_id)
          .single();

        if (dm) {
          const otherUserId =
            dm.user1_id === record.pinned_by ? dm.user2_id : dm.user1_id;
          if (otherUserId !== record.pinned_by) {
            recipients.push(otherUserId);
          }
        }

        payload = {
          title: "📌 Message pinned",
          body: `${pinner?.full_name} pinned a message`,
          icon:
            avatarUrl(pinner?.full_name, pinner?.avatar_color) ||
            "/icons/icon-72.png",
          dm_id: record.dm_id,
          message_id: record.message_id,
          tag: `pin-${record.dm_id}`,
        };
      }
    }

    console.log("Table:", table);
    console.log("Record user_id:", record.user_id);
    console.log("Recipients found:", recipients);

    for (const userId of recipients) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              ...payload,
              recipient_id: userId,
            }),
          );
        } catch (err: any) {
          console.error("Push failed:", err);

          // 🔥 CRITICAL FIX
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    return new Response("OK");
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});
