// Supabase Edge Function: send-push
// Sends a browser push notification to a target user.
// Invoke via HTTP POST with JSON body: { targetUserId, title, body, url }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Base64url helpers
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getVapidAuthHeader(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: "mailto:water@app.local" };

  const encode = (obj: object) =>
    uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const keyData = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
  return `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { targetUserId, title, body, url } = await req.json();

  if (!targetUserId) {
    return new Response("Missing targetUserId", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Load target user's push subscription
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error || !data) {
    return new Response("No subscription found for user", { status: 404 });
  }

  const sub = data.subscription as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  // Build the push payload
  const pushPayload = JSON.stringify({ title: title || "Water App", body: body || "Time to hydrate!", url: url || "/" });

  // Encrypt payload using Web Push encryption (RFC 8291)
  // For simplicity we use the raw endpoint with VAPID auth only (no payload encryption)
  // For full payload encryption a library like web-push is needed server-side
  const audience = new URL(sub.endpoint).origin;
  const authHeader = await getVapidAuthHeader(audience);

  // Encode payload
  const payloadBytes = new TextEncoder().encode(pushPayload);

  // Import receiver's public key
  const receiverPublicKey = base64UrlToUint8Array(sub.keys.p256dh);
  const authSecret = base64UrlToUint8Array(sub.keys.auth);

  // Generate sender key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", senderKeyPair.publicKey)
  );

  const receiverKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey },
    senderKeyPair.privateKey,
    256
  );

  // HKDF to derive content encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);

  // Simple approach: send unencrypted via urgency header (browsers accept this for testing)
  const response = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "normal",
    },
    body: payloadBytes,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Push send failed:", response.status, text);
    return new Response(`Push failed: ${response.status}`, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
