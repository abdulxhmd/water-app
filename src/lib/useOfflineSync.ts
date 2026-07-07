"use client";

import { useEffect, useSyncExternalStore } from "react";

import { flushQueue, getPendingCount, onQueueChange } from "@/lib/offlineQueue";

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOfflineSync() {
  const pendingCount = useSyncExternalStore(onQueueChange, getPendingCount, () => 0);
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );

  // Flush on mount (covers writes queued before a reload) and on reconnect.
  useEffect(() => {
    if (isOnline) void flushQueue();
  }, [isOnline]);

  return { pendingCount, isOnline };
}
