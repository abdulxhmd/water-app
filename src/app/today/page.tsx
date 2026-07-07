"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { formatLocalDate, formatShortDate, getPreviousLocalDate } from "@/lib/date";
import { getUserNames } from "@/lib/users";
import { useProfile } from "@/lib/useProfile";
import { usePartner } from "@/lib/usePartner";
import { clampWater, MAX_SINGLE_ENTRY_ML } from "@/lib/water";
import { getRandomHydrationMessage } from "@/lib/hydrationMessages";
import UserAvatar from "@/components/UserAvatar";
import PageFooter from "@/components/PageFooter";

export default function TodayPage() {
  // Core state for today.
  const [water, setWater] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const { currentName, partnerName } = getUserNames(user?.email);
  const greetingName = currentName === "You" ? "there" : currentName;
  const avatarUrl = useProfile(userId);
  const goal = 4000; // Daily target in milliliters.
  const [hydrationMessage] = useState(() => getRandomHydrationMessage());

  // "Log yesterday" support: lets someone who forgot to save before midnight
  // correct the previous day's total from today's screen.
  const yesterdayDate = formatLocalDate(getPreviousLocalDate(new Date()));
  const [showYesterdayEditor, setShowYesterdayEditor] = useState(false);
  const [yesterdayWater, setYesterdayWater] = useState("");
  const [yesterdaySaved, setYesterdaySaved] = useState(false);
  const [yesterdaySaveError, setYesterdaySaveError] = useState<string | null>(null);
  const [isSavingYesterday, setIsSavingYesterday] = useState(false);

  // "Remind partner" support: a manual nudge push, gated on the partner
  // having opted into `partner_reminder` in their own settings.
  const { partnerId } = usePartner(userId, loading);
  const [partnerAllowsReminders, setPartnerAllowsReminders] = useState(false);
  const [reminderSentStatus, setReminderSentStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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
      setIsLoadingToday(true);
      const today = formatLocalDate(new Date());
      const { data, error } = await supabase
        .from("daily_water")
        .select("date, water_ml")
        .eq("user_id", userId)
        .in("date", [today, yesterdayDate]);

      if (error) {
        console.error("Error loading daily water:", error);
        setIsLoadingToday(false);
        return;
      }

      const todayRow = data?.find((row) => row.date === today);
      const yesterdayRow = data?.find((row) => row.date === yesterdayDate);

      if (todayRow?.water_ml != null) {
        setWater(clampWater(todayRow.water_ml));
      }
      setYesterdayWater(yesterdayRow?.water_ml != null ? String(yesterdayRow.water_ml) : "");
      setIsLoadingToday(false);
    };

    loadToday();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  useEffect(() => {
    if (!partnerId) {
      setPartnerAllowsReminders(false);
      return;
    }

    let isMounted = true;

    supabase
      .from("user_preferences")
      .select("partner_reminder")
      .eq("user_id", partnerId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Error loading partner reminder preference:", error);
          return;
        }
        setPartnerAllowsReminders(data?.partner_reminder ?? false);
      });

    return () => {
      isMounted = false;
    };
  }, [partnerId]);

  // Shared handlers for custom input.
  const handleAddCustom = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCustomError("Enter a positive number of ml.");
      return;
    }
    if (amount > MAX_SINGLE_ENTRY_ML) {
      setCustomError(`Single entries are capped at ${MAX_SINGLE_ENTRY_ML.toLocaleString()} ml.`);
      return;
    }

    setWater((prevWater) => clampWater(prevWater + amount));
    setCustomAmount("");
    setCustomError(null);
  };
  const handleSubtractCustom = () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCustomError("Enter a positive number of ml.");
      return;
    }
    if (amount > MAX_SINGLE_ENTRY_ML) {
      setCustomError(`Single entries are capped at ${MAX_SINGLE_ENTRY_ML.toLocaleString()} ml.`);
      return;
    }

    setWater((prevWater) => clampWater(prevWater - amount));
    setCustomAmount("");
    setCustomError(null);
  };
  const handleQuickAdd = (amount: number) => {
    setWater((prevWater) => clampWater(prevWater + amount));
  };
  const handleSaveToday = async () => {
    if (loading || !userId) {
      return;
    }

    setSaveError(null);

    const today = formatLocalDate(new Date());
    const { error } = await supabase
      .from("daily_water")
      .upsert(
        {
          user_id: userId,
          date: today,
          water_ml: clampWater(water),
        },
        { onConflict: "user_id,date" }
      );

    if (error) {
      console.error("Error saving daily water:", error);
      setSaveError("Something went wrong saving your data. Please try again.");
      return;
    }

    setSaved(true);
  };

  const handleSaveYesterday = async () => {
    if (loading || !userId) {
      return;
    }

    const amount = Number(yesterdayWater);
    if (!Number.isFinite(amount) || amount < 0) {
      setYesterdaySaveError("Enter a non-negative number of ml.");
      return;
    }

    setIsSavingYesterday(true);
    setYesterdaySaveError(null);

    const { error } = await supabase
      .from("daily_water")
      .upsert(
        {
          user_id: userId,
          date: yesterdayDate,
          water_ml: clampWater(amount),
        },
        { onConflict: "user_id,date" }
      );

    setIsSavingYesterday(false);

    if (error) {
      console.error("Error saving yesterday's water:", error);
      setYesterdaySaveError("Something went wrong saving that. Please try again.");
      return;
    }

    setYesterdaySaved(true);
  };

  const handleRemindPartner = async () => {
    if (!partnerId || reminderSentStatus === "sending") {
      return;
    }

    setReminderSentStatus("sending");

    const { error } = await supabase.functions.invoke("send-push", {
      body: {
        targetUserId: partnerId,
        title: `${currentName} sent a reminder`,
        body: "Time to drink some water!",
        url: "/today",
      },
    });

    setReminderSentStatus(error ? "error" : "sent");
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
          <UserAvatar avatarUrl={avatarUrl} name={currentName} />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-8 sm:pt-10">
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            {formatDateTime(now)}
          </p>
          <p className="text-2xl font-light text-slate-800 dark:text-slate-800 md:text-3xl">
            Good morning, {greetingName}.
          </p>
        </div>

        <div className="relative mb-10 flex h-[260px] w-[260px] items-center justify-center sm:h-[320px] sm:w-[320px] md:h-[400px] md:w-[400px]">
          <div className="absolute inset-0 flex items-end overflow-hidden rounded-3xl border border-[#E3E8F5] bg-white/70">
            <div
              className="w-full bg-[#7FB8FF]/25 transition-[height] duration-700 ease-in-out"
              style={{ height: `${fillPercent}%` }}
            />
          </div>

          <div className={`z-10 flex flex-col items-center text-center ${isLoadingToday ? "animate-pulse opacity-60" : ""}`}>
            <span className="text-6xl font-bold tracking-tighter text-slate-800 dark:text-slate-800 md:text-7xl">
              {isLoadingToday ? "—" : water}
            </span>
            <span className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-600">
              {isLoadingToday ? "Loading…" : `${fillPercent}% hydrated`}
            </span>
            <span className="mt-1 text-lg font-medium text-slate-500 dark:text-slate-500">
              / {goal.toLocaleString()} ml
            </span>
            <div className="mt-4 rounded-full border border-white/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-[#7FB8FF] backdrop-blur-sm dark:bg-white/80">
              {isLoadingToday ? "Fetching today's total" : hydrationLabel}
            </div>
          </div>
        </div>

        <div className="z-20 flex w-full max-w-md flex-col items-center gap-6">
          {!showCustomInput ? (
            <div className="group relative">
              <div className="absolute -inset-1 rounded-full bg-[#7FB8FF]/30 blur opacity-40 transition duration-200 group-hover:opacity-75" />
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  setCustomError(null);
                }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] text-white shadow-[0_18px_35px_rgba(127,184,255,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 md:h-20 md:w-20"
              >
                <span className="material-symbols-outlined text-[32px] md:text-[40px]">
                  add
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="flex w-44 items-center gap-2 rounded-2xl border border-[#E3E8F5] bg-white/80 px-3 py-2 shadow-sm sm:w-56">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={MAX_SINGLE_ENTRY_ML}
                    value={customAmount}
                    onChange={(event) => {
                      setCustomAmount(event.target.value);
                      setCustomError(null);
                    }}
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
              {customError ? (
                <p className="text-xs font-medium text-rose-500">{customError}</p>
              ) : null}
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
            disabled={saved || isLoadingToday}
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
          {saveError ? (
            <p className="text-xs font-medium text-rose-500">{saveError}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!showYesterdayEditor ? (
              <button
                type="button"
                onClick={() => setShowYesterdayEditor(true)}
                className="text-xs font-medium text-slate-500 underline transition-colors hover:text-[#7FB8FF]"
              >
                Forgot to log yesterday?
              </button>
            ) : null}

            {partnerId ? (
              <button
                type="button"
                onClick={handleRemindPartner}
                disabled={!partnerAllowsReminders || reminderSentStatus === "sending"}
                title={
                  partnerAllowsReminders
                    ? undefined
                    : `${partnerName} has partner reminders turned off`
                }
                className="rounded-full border border-[#E3E8F5] bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reminderSentStatus === "sent"
                  ? "Reminder sent"
                  : reminderSentStatus === "sending"
                    ? "Sending…"
                    : `Remind ${partnerName}`}
              </button>
            ) : null}
          </div>
          {reminderSentStatus === "error" ? (
            <p className="text-xs font-medium text-rose-500">
              Could not send the reminder. Please try again.
            </p>
          ) : null}

          {showYesterdayEditor ? (
            <div className="w-full max-w-xs rounded-2xl border border-[#E3E8F5] bg-white/80 p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">
                {formatShortDate(yesterdayDate)}&apos;s water
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={yesterdayWater}
                  onChange={(event) => {
                    setYesterdayWater(event.target.value);
                    setYesterdaySaved(false);
                    setYesterdaySaveError(null);
                  }}
                  placeholder="Total ml"
                  className="w-full rounded-lg border border-[#E3E8F5] bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveYesterday}
                  disabled={isSavingYesterday}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingYesterday ? "Saving…" : "Save"}
                </button>
              </div>
              {yesterdaySaved ? (
                <p className="mt-2 text-xs font-medium text-slate-500">Saved.</p>
              ) : null}
              {yesterdaySaveError ? (
                <p className="mt-2 text-xs font-medium text-rose-500">{yesterdaySaveError}</p>
              ) : null}
            </div>
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
                &quot;{hydrationMessage.quote}&quot;
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {hydrationMessage.sub}
              </p>
            </div>
          </div>
        </div>
      </main>

      <PageFooter />

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


