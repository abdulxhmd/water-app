"use client";

import { useEffect } from "react";

import { useOfflineSync } from "@/lib/useOfflineSync";

export default function PwaBootstrap() {
  // Flushes any offline-queued saves on load and whenever the app reconnects,
  // regardless of which page is open.
  useOfflineSync();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures (e.g. private browsing) are non-fatal;
      // push subscription retries registration on its own.
    });
  }, []);

  return null;
}
