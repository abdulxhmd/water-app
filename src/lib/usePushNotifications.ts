"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "error">("idle");

  const subscribe = async (userId: string): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("error");
      return false;
    }

    setStatus("loading");

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to Supabase
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          subscription: subscription.toJSON(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Failed to save push subscription:", error);
        setStatus("error");
        return false;
      }

      setStatus("granted");
      return true;
    } catch (err) {
      console.error("Push subscription error:", err);
      setStatus("error");
      return false;
    }
  };

  const unsubscribe = async (userId: string): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await supabase.from("push_subscriptions").delete().eq("user_id", userId);
      setStatus("idle");
    } catch (err) {
      console.error("Unsubscribe error:", err);
    }
  };

  const checkStatus = async (): Promise<void> => {
    if (!("Notification" in window)) {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") setStatus("granted");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("idle");
  };

  return { status, subscribe, unsubscribe, checkStatus };
}
