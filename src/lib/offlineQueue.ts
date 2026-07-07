import { supabase } from "@/lib/supabase";

// Offline write queue for daily_water. The app saves a day's TOTAL as an
// upsert keyed on (user_id, date), so the queue only needs the latest total
// per day — flushing is naturally idempotent and last-write-wins.

export type QueuedWaterSave = {
  user_id: string;
  date: string;
  water_ml: number;
  queuedAt: string;
};

const QUEUE_KEY = "water-app:offline-queue";
const QUEUE_EVENT = "water-app:queue-changed";

function readQueue(): Record<string, QueuedWaterSave> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, QueuedWaterSave>) : {};
  } catch {
    return {};
  }
}

function writeQueue(queue: Record<string, QueuedWaterSave>) {
  if (typeof window === "undefined") return;
  if (Object.keys(queue).length === 0) {
    window.localStorage.removeItem(QUEUE_KEY);
  } else {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function queueWaterSave(entry: Omit<QueuedWaterSave, "queuedAt">) {
  const queue = readQueue();
  queue[`${entry.user_id}|${entry.date}`] = { ...entry, queuedAt: new Date().toISOString() };
  writeQueue(queue);
}

export function getQueuedSave(userId: string, date: string): QueuedWaterSave | null {
  return readQueue()[`${userId}|${date}`] ?? null;
}

export function getPendingCount(): number {
  return Object.keys(readQueue()).length;
}

export function onQueueChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_EVENT, listener);
  // Also react to changes from other tabs.
  const storageListener = (event: StorageEvent) => {
    if (event.key === QUEUE_KEY) listener();
  };
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(QUEUE_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}

// Last total we saw for a (user, date) — from a successful load or save —
// so reopening the app offline shows the real number instead of 0.
const KNOWN_TOTAL_KEY = "water-app:known-total";

export function cacheKnownTotal(userId: string, date: string, waterMl: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KNOWN_TOTAL_KEY,
    JSON.stringify({ userId, date, waterMl })
  );
}

export function getKnownTotal(userId: string, date: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KNOWN_TOTAL_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { userId: string; date: string; waterMl: number };
    return cached.userId === userId && cached.date === date ? cached.waterMl : null;
  } catch {
    return null;
  }
}

// Treat fetch-level failures as "offline"; anything else (RLS, validation)
// is a real error that queuing would never fix.
export function isOfflineError(error: { message?: string } | null): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return /fetch|network|load failed/i.test(error?.message ?? "");
}

let flushInFlight: Promise<{ synced: number; remaining: number }> | null = null;

export function flushQueue(): Promise<{ synced: number; remaining: number }> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const queue = readQueue();
    const keys = Object.keys(queue);
    if (keys.length === 0) return { synced: 0, remaining: 0 };

    let synced = 0;
    for (const key of keys) {
      const { user_id, date, water_ml } = queue[key];
      const { error } = await supabase
        .from("daily_water")
        .upsert({ user_id, date, water_ml }, { onConflict: "user_id,date" });

      if (error) {
        // Still offline (or auth expired) — keep the rest for the next attempt.
        if (isOfflineError(error)) break;
        // Permanent failure (e.g. RLS): drop the entry so it can't wedge the queue.
        console.error("Dropping unsyncable queued save:", key, error.message);
        delete queue[key];
        continue;
      }

      delete queue[key];
      synced += 1;
    }

    writeQueue(queue);
    return { synced, remaining: Object.keys(queue).length };
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
