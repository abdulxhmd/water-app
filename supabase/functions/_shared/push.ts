// Shared Web Push sending logic used by both send-push and daily-reminder.
// Uses the npm:web-push package (VAPID JWT signing + RFC 8291 payload
// encryption) instead of hand-rolled crypto, via Deno's npm specifier support
// in the Supabase Edge Runtime.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails("mailto:water@app.local", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushMessage = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Sends a push message to one user. Returns "sent", "no_subscription", or
 * "expired" (the subscription was rejected by the push service and has been
 * deleted so the caller doesn't keep retrying it).
 */
export async function sendPushToUser(
  supabase: ReturnType<typeof getServiceClient>,
  targetUserId: string,
  message: PushMessage
): Promise<"sent" | "no_subscription" | "expired" | "error"> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error || !data) {
    return "no_subscription";
  }

  const subscription = data.subscription as PushSubscriptionJSON;

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: message.title, body: message.body, url: message.url || "/" })
    );
    return "sent";
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("user_id", targetUserId);
      return "expired";
    }
    console.error(`Push send failed for user ${targetUserId}:`, err);
    return "error";
  }
}
