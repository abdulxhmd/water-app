// Supabase Edge Function: daily-reminder
// Meant to be triggered once a day by a Supabase Cron Job (see
// docs/SETUP.md). Pushes a hydration reminder to every user who has opted
// into `daily_reminder` in user_preferences, unconditionally (it does not
// check whether they already logged water today).

import { getServiceClient, sendPushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("daily_reminder", true);

  if (error) {
    console.error("Error loading reminder recipients:", error);
    return new Response("Could not load recipients", { status: 500 });
  }

  const recipients = data ?? [];
  const results = await Promise.all(
    recipients.map((row) =>
      sendPushToUser(supabase, row.user_id, {
        title: "Water App",
        body: "Don't forget to log your water today!",
        url: "/today",
      })
    )
  );

  const sent = results.filter((r) => r === "sent").length;

  return new Response(JSON.stringify({ ok: true, recipients: recipients.length, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
