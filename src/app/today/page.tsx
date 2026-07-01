"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

export default function TodayPage() {
  // Core state for today.
  const [water, setWater] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const { currentName } = getUserNames(user?.email);
  const goal = 4000; // Daily target in milliliters.

  // Derived display values.
  const fillPercent = Math.min(100, Math.round((water / goal) * 100));
  const hydrationLabel = getHydrationLabel(fillPercent);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (loading || !userId) {
      return;
    }

    const loadToday = async () => {
      const today = formatLocalDate(new Date());
      const { data, error } = await supabase
        .from("daily_water")
        .select("water_ml")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();

      if (error) {
        console.error("Error loading daily water:", error);
        return;
      }

      if (data?.water_ml != null) {
        setWater(Math.max(0, data.water_ml));
      }
    };

    loadToday();
  }, [loading, userId]);

  // Shared handlers for custom input.
  const handleAddCustom = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCustomAmount("");
      return;
    }

    setWater((prevWater) => Math.max(0, prevWater + amount));
    setCustomAmount("");
  };
  const handleSubtractCustom = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCustomAmount("");
      return;
    }

    setWater((prevWater) => Math.max(0, prevWater - amount));
    setCustomAmount("");
  };
  const handleQuickAdd = (amount: number) => {
    setWater((prevWater) => Math.max(0, prevWater + amount));
  };
  const handleSaveToday = async () => {
    if (loading || !userId) {
      return;
    }

    const today = formatLocalDate(new Date());
    const { error } = await supabase
      .from("daily_water")
      .upsert(
        {
          user_id: userId,
          date: today,
          water_ml: Math.max(0, water),
        },
        { onConflict: "user_id,date" }
      );

    if (error) {
      console.error("Error saving daily water:", error);
      alert("Something went wrong saving data");
      return;
    }

    setSaved(true);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F7FAFF] text-slate-800 transition-colors duration-200 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-70">
        <div className="absolute left-[-10%] top-[-20%] h-[60%] w-[60%] rounded-full bg-[#E9E2FF]/35 blur-[120px] dark:bg-[#7FB8FF]/10" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[60%] w-[60%] rounded-full bg-[#7FB8FF]/10 blur-[140px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between border-b border-[#E3E8F5] bg-white/80 px-4 py-4 backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/80 sm:px-6 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7FB8FF]/10 text-[#7FB8FF]">
            <span className="material-symbols-outlined text-[22px]">
              water_drop
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-600">
              Water App
            </span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-800">
              Today
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="rounded-full bg-[#E9E2FF]/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-[#E9E2FF] dark:bg-white/70 dark:text-slate-800 dark:hover:bg-white/90"
          >
            Settings
          </Link>
          <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-[#dbe6f2] sm:h-10 sm:w-10">
            <img
              alt="User profile avatar"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfvs6OlZK_w1BLHOt_bAX5iTu4TLBka-wO4AuP2P4E_lUTblQlF0DAdGvO7LIBH3722F4O44wkpuVaZbhWBiV7NeVnaoV1ksPyDshJCFL8P5iNBQTRCmqUZD5AIQ7TGM_dtpKa3yFOERA0pT77q1p1WVZvdQHE53xaCBPAXEB5bTMWQt_V2r-mdJgltKVFd6mLzQ3j68Ne7bLxI27n0o3wfTB-hd72RdHOxnSE6AYCMLcpmL5R744pB67opzaMedj0cUyMyyIMuGo"
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-8 sm:pt-10">
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            {formatDateTime(now)}
          </p>
          <p className="text-2xl font-light text-slate-800 dark:text-slate-800 md:text-3xl">
            Good morning, {currentName}.
          </p>
        </div>

        <div className="relative mb-10 flex h-[260px] w-[260px] items-center justify-center sm:h-[320px] sm:w-[320px] md:h-[400px] md:w-[400px]">
          <div className="absolute inset-0 flex items-end overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70">
            <div
              className="w-full bg-[#7FB8FF]/25 transition-[height] duration-700 ease-in-out"
              style={{ height: `${fillPercent}%` }}
            />
          </div>

          <div className="z-10 flex flex-col items-center text-center">
            <span className="text-6xl font-bold tracking-tighter text-slate-800 dark:text-slate-800 md:text-7xl">
              {water}
            </span>
            <span className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-600">
              {fillPercent}% hydrated
            </span>
            <span className="mt-1 text-lg font-medium text-slate-500 dark:text-slate-500">
              / {goal.toLocaleString()} ml
            </span>
            <div className="mt-4 rounded-full border border-white/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-[#7FB8FF] backdrop-blur-sm dark:bg-white/80">
              {hydrationLabel}
            </div>
          </div>
        </div>

        <div className="z-20 flex w-full max-w-md flex-col items-center gap-6">
          {!showCustomInput ? (
            <div className="group relative">
              <div className="absolute -inset-1 rounded-full bg-[#7FB8FF]/30 blur opacity-40 transition duration-200 group-hover:opacity-75" />
              <button
                onClick={() => setShowCustomInput(true)}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] text-white shadow-[0_18px_35px_rgba(127,184,255,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:h-20 md:w-20"
              >
                <span className="material-symbols-outlined text-[32px] md:text-[40px]">
                  add
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex w-44 items-center gap-2 rounded-2xl border border-[#E3E8F5] bg-white/80 px-3 py-2 shadow-sm sm:w-56">
                <input
                  type="number"
                  inputMode="numeric"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                  placeholder="Custom ml"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
              <button
                onClick={handleSubtractCustom}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E3E8F5] bg-white/80 text-slate-500 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-[24px]">remove</span>
              </button>
              <button
                onClick={handleAddCustom}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E3E8F5] bg-white/80 text-[#7FB8FF] shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleQuickAdd(250)}
              className="rounded-lg border border-slate-300 py-2 text-sm"
            >
              +250
            </button>
            <button
              onClick={() => handleQuickAdd(500)}
              className="rounded-lg border border-slate-300 py-2 text-sm"
            >
              +500
            </button>
            <button
              onClick={() => handleQuickAdd(750)}
              className="rounded-lg border border-slate-300 py-2 text-sm"
            >
              +750
            </button>
          </div>
          <button
            onClick={handleSaveToday}
            disabled={saved}
            className={`rounded-full border border-[#E3E8F5] px-5 py-2 text-sm font-medium shadow-sm transition-all ${
              saved
                ? "bg-white/60 text-slate-500"
                : "bg-white/80 text-slate-700 hover:scale-105 active:scale-95"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {saved ? "Saved" : "Save for today"}
          </button>
          {saved ? (
            <p className="animate-fade-in text-xs font-medium text-slate-500">
              Saved for today. You can keep tracking anytime.
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-4 mt-10 flex w-full max-w-lg justify-center px-2 sm:px-0">
          <div className="flex w-full items-center gap-4 rounded-2xl border border-[#E3E8F5] bg-white/80 p-4 shadow-lg backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/90">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7FB8FF]/10">
              <span className="material-symbols-outlined text-[20px] text-[#7FB8FF]">
                favorite
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-700 md:text-base">
                &quot;A sip for you is a win for both of us.&quot;
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Keep flowing, you&apos;re doing great!
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mt-auto border-t border-[#E3E8F5] bg-white/70 px-4 py-6 text-xs text-slate-500 backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/70 dark:text-slate-600 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p>Hydration, shared.</p>
          <div className="flex gap-4">
            <a className="transition-colors hover:text-[#7FB8FF]" href="#">
              Privacy
            </a>
            <a className="transition-colors hover:text-[#7FB8FF]" href="#">
              Terms
            </a>
            <a className="transition-colors hover:text-[#7FB8FF]" href="#">
              Help
            </a>
          </div>
        </div>
      </footer>

      <div className="pointer-events-none fixed left-0 top-0 -z-10 h-full w-full overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[#9BD7FF]/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-blue-400/5 blur-[80px]" />
      </div>
    </div>
  );
}

function getHydrationLabel(fillPercent: number) {
  if (fillPercent === 0) {
    return "Get started";
  }
  if (fillPercent < 50) {
    return "Keep going";
  }
  if (fillPercent < 80) {
    return "Almost there";
  }
  if (fillPercent < 100) {
    return "Nearly at goal";
  }
  return "Reached the goal";
}

function getUserNames(email?: string | null) {
  const normalized = email?.split("@")[0]?.toLowerCase() ?? "";
  const userAName = "Shahul";
  const userBName = "Shaima";

  if (normalized === userBName.toLowerCase()) {
    return { currentName: userBName, partnerName: userAName };
  }

  if (normalized === userAName.toLowerCase()) {
    return { currentName: userAName, partnerName: userBName };
  }

  return { currentName: "there", partnerName: "Partner" };
}

function formatDateTime(date: Date) {
  // Use fixed UTC-based format to avoid hydration mismatch
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const weekday = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hour = date.getHours() % 12 || 12;
  const minute = String(date.getMinutes()).padStart(2, "0");
  const ampm = date.getHours() >= 12 ? "PM" : "AM";
  
  return `${weekday}, ${month} ${day}, ${hour}:${minute} ${ampm}`;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}



