// Supabase Edge Function: send-push
// Sends a single browser push notification to a target user on demand.
// Invoke via HTTP POST with JSON body: { targetUserId, title, body, url }

import { getServiceClient, sendPushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { targetUserId, title, body, url } = await req.json();

  if (!targetUserId) {
    return new Response("Missing targetUserId", { status: 400 });
  }

  const supabase = getServiceClient();
  const result = await sendPushToUser(supabase, targetUserId, {
    title: title || "Water App",
    body: body || "Time to hydrate!",
    url,
  });

  if (result === "no_subscription") {
    return new Response("No subscription found for user", { status: 404 });
  }
  if (result === "error") {
    return new Response("Push failed", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { "Content-Type": "application/json" },
  });
});
