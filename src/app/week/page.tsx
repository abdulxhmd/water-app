"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import {
  buildWeekDays,
  endOfLocalDay,
  formatShortDate,
  getWeekRange,
} from "@/lib/date";
import { getPossessive, getUserNames } from "@/lib/users";
import { useProfile } from "@/lib/useProfile";
import { usePartner } from "@/lib/usePartner";
import UserAvatar from "@/components/UserAvatar";
import PageFooter from "@/components/PageFooter";
import type { DailyWaterRow } from "@/lib/types";
import {
  getWeeklyResult,
  getWeeklyWinner,
  mapWeeklyResultRowToCurrent,
} from "@/lib/weeklyResult";

type DailyWaterEntry = DailyWaterRow;

const DAILY_GOAL_ML = 4000;

function getDaysAtGoalLabel(days: { water: number }[]) {
  const daysAtGoal = days.filter((day) => day.water >= DAILY_GOAL_ML).length;
  if (daysAtGoal === days.length) {
    return "Perfect week!";
  }
  if (daysAtGoal === 0) {
    return "Keep going";
  }
  return `${daysAtGoal}/${days.length} days at goal`;
}

export default function WeekPage() {
  const [weekEntries, setWeekEntries] = useState<DailyWaterEntry[]>([]);
  const [partnerWeekEntries, setPartnerWeekEntries] = useState<DailyWaterEntry[]>([]);
  const [isLoadingWeek, setIsLoadingWeek] = useState(true);
  const [weeklyTotals, setWeeklyTotals] = useState<{
    userA: number;
    userB: number;
  } | null>(null);
  const [weeklyWinnerState, setWeeklyWinnerState] = useState<string>("");
  const [resultSaveError, setResultSaveError] = useState<string | null>(null);
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const { partnerId, isLoaded: isPartnerLoaded } = usePartner(userId, loading);
  const USER_A = userId ?? "";
  const USER_B = partnerId ?? "";
  const { currentName, partnerName } = getUserNames(user?.email);
  const avatarUrl = useProfile(userId);
  const partnerAvatarUrl = useProfile(partnerId);

  const { startDate, endDate } = getWeekRange(new Date());
  const isWeekLocked = new Date() > endOfLocalDay(endDate);

  const currentWeekTotal = weekEntries.reduce((sum, entry) => sum + entry.water_ml, 0);
  const partnerWeekTotal = partnerWeekEntries.reduce((sum, entry) => sum + entry.water_ml, 0);
  const computedWeeklyTotals = useMemo(
    () => ({ userA: currentWeekTotal, userB: partnerWeekTotal }),
    [currentWeekTotal, partnerWeekTotal]
  );
  const effectiveWeeklyTotals = weeklyTotals ?? computedWeeklyTotals;
  const weeklyWinner = weeklyWinnerState || getWeeklyWinner(effectiveWeeklyTotals, USER_A, USER_B);
  const weeklyResult = getWeeklyResult(weeklyWinner, USER_A, USER_B, currentName, partnerName);
  const currentWeeklyLiters = (effectiveWeeklyTotals.userA / 1000).toFixed(1);
  const partnerWeeklyLiters = (effectiveWeeklyTotals.userB / 1000).toFixed(1);
  const currentWeeklyAverage = (effectiveWeeklyTotals.userA / 7 / 1000).toFixed(1);
  const partnerWeeklyAverage = (effectiveWeeklyTotals.userB / 7 / 1000).toFixed(1);
  const weekDateLabel = `${formatShortDate(startDate)} — ${formatShortDate(endDate)}`;
  const weekHeading = `Week of ${weekDateLabel}`;

  useEffect(() => {
    if (loading || !userId || !isPartnerLoaded) {
      return;
    }

    const loadWeekEntries = async () => {
      setIsLoadingWeek(true);
      const query = supabase
        .from("daily_water")
        .select("user_id, date, water_ml")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      const request = partnerId
        ? query.in("user_id", [userId, partnerId])
        : query.eq("user_id", userId);

      const { data, error } = await request;

      if (error) {
        console.error("Error loading weekly water:", error);
        setIsLoadingWeek(false);
        return;
      }

      const entries = data ?? [];
      setWeekEntries(entries.filter((entry) => entry.user_id === userId));
      setPartnerWeekEntries(entries.filter((entry) => entry.user_id === partnerId));
      setIsLoadingWeek(false);
    };

    loadWeekEntries();
  }, [loading, partnerId, isPartnerLoaded, startDate, endDate, userId]);

  const weekDays = buildWeekDays(startDate, weekEntries);
  const partnerWeekDays = buildWeekDays(startDate, partnerWeekEntries);
  const weeklyTotal = weekDays.reduce((sum, day) => sum + day.water, 0);
  const currentWeekStatus =
    effectiveWeeklyTotals.userA >= effectiveWeeklyTotals.userB
      ? "You're ahead this week"
      : "Keep drinking to catch up";
  const partnerWeekStatus =
    effectiveWeeklyTotals.userB > effectiveWeeklyTotals.userA
      ? "Partner is ahead"
      : "Keep going, you're close";
  const isCurrentUserLeading =
    effectiveWeeklyTotals.userA > effectiveWeeklyTotals.userB;
  const isPartnerLeading =
    effectiveWeeklyTotals.userB > effectiveWeeklyTotals.userA;
  const currentDaysAtGoalLabel = getDaysAtGoalLabel(weekDays);
  const partnerDaysAtGoalLabel = getDaysAtGoalLabel(partnerWeekDays);

  useEffect(() => {
    if (!isWeekLocked || loading || !userId || !partnerId) {
      return;
    }

    const loadOrSaveWeeklyResult = async () => {
      const { data, error } = await supabase
        .from("weekly_results")
        .select("user_a_total, user_b_total, winner, user_a_id, user_b_id")
        .eq("week_start", startDate)
        .eq("week_end", endDate)
        .or(
          `and(user_a_id.eq.${USER_A},user_b_id.eq.${USER_B}),and(user_a_id.eq.${USER_B},user_b_id.eq.${USER_A})`
        )
        .maybeSingle();

      if (error) {
        console.error("Error checking weekly result:", error);
        return;
      }

      if (data) {
        const mapped = mapWeeklyResultRowToCurrent(data, USER_A, USER_B);
        if (mapped) {
          setWeeklyTotals({
            userA: mapped.userATotal,
            userB: mapped.userBTotal,
          });
          setWeeklyWinnerState(mapped.winner);
        }
        return;
      }

      const totalsToSave = weeklyTotals ?? computedWeeklyTotals;
      if (!partnerId) {
        return;
      }

      const computedWinner = getWeeklyWinner(totalsToSave, USER_A, USER_B);
      if (!computedWinner) {
        return;
      }

      const { error: insertError } = await supabase
        .from("weekly_results")
        .insert({
          week_start: startDate,
          week_end: endDate,
          user_a_id: USER_A,
          user_b_id: USER_B,
          user_a_total: totalsToSave.userA,
          user_b_total: totalsToSave.userB,
          winner: computedWinner,
        });

      if (insertError) {
        console.error("Error saving weekly result:", insertError);
        setResultSaveError("Could not save this week's result. It will retry next visit.");
        return;
      }

      setWeeklyWinnerState(computedWinner);
    };

    loadOrSaveWeeklyResult();
  }, [
    USER_A,
    USER_B,
    computedWeeklyTotals,
    endDate,
    isWeekLocked,
    loading,
    partnerId,
    startDate,
    userId,
    weeklyTotals,
  ]);

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-slate-800 transition-colors duration-200 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E8F5] bg-white/80 px-4 py-4 backdrop-blur-md transition-colors duration-200 dark:border-[#dbe6f2] dark:bg-[#eef7ff]/80 sm:px-6 lg:px-10">
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
              Week
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

      <main className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-start overflow-hidden px-4 py-8 lg:py-12">
        <div className="w-full max-w-[960px] space-y-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#7FB8FF]">
                <span className="material-symbols-outlined text-lg">
                  calendar_today
                </span>
                Weekly Recap
              </div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-800 dark:text-slate-800 md:text-4xl">
                {weekHeading}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled
                title="Browsing previous weeks isn't available yet"
                className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-[#E3E8F5] bg-white text-slate-500 opacity-60 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-600"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="px-2 text-sm font-medium text-slate-500 dark:text-slate-600">
                {weekDateLabel}
              </span>
              <button
                disabled
                title="Browsing future weeks isn't available yet"
                className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-[#E3E8F5] bg-white text-slate-500 opacity-60 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-600"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          {isWeekLocked ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 px-4 py-3 text-center text-sm text-slate-500 shadow-sm">
              This week&apos;s results are locked. Changes are no longer allowed.
            </div>
          ) : null}

          {isPartnerLoaded && !partnerId ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 px-4 py-3 text-center text-sm text-slate-500 shadow-sm">
              No partner is paired with your account yet, so only your own
              totals are shown below.
            </div>
          ) : null}

          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#7FB8FF]/20 bg-gradient-to-r from-[#7FB8FF]/10 to-transparent p-6 text-center md:flex-row md:text-left">
            <div>
              <h2 className="mb-1 text-xl font-semibold text-slate-800 dark:text-slate-800 md:text-2xl">
                {isWeekLocked
                  ? weeklyResult || "This week's results are in."
                  : "This week is still in progress."}
              </h2>
              <p className="text-slate-500 dark:text-slate-600">
                Staying hydrated together keeps the bond strong.
              </p>
            </div>
            <div className="flex items-center -space-x-3">
              <UserAvatar
                avatarUrl={avatarUrl}
                name={currentName}
                sizeClassName="h-10 w-10"
              />
              <UserAvatar
                avatarUrl={partnerAvatarUrl}
                name={partnerName}
                sizeClassName="h-10 w-10"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
              This Week
            </h3>
            {isLoadingWeek ? (
              <p className="mt-4 text-sm text-slate-500">Loading this week&apos;s data…</p>
            ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-lg border border-[#E3E8F5] bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]"
                >
                  <span className="font-medium text-slate-600">
                    {day.label}
                  </span>
                  <span className="text-slate-700">{day.water} ml</span>
                </div>
              ))}
            </div>
            )}
            <div className="mt-4 text-xs font-medium text-slate-500">
              {isWeekLocked ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E3E8F5] bg-white/80 px-3 py-1">
                  <span className="material-symbols-outlined text-sm text-slate-400">
                    lock
                  </span>
                  This week&apos;s results are locked
                </span>
              ) : (
                <span>This week is still in progress</span>
              )}
            </div>
          </div>

          {isWeekLocked ? (
            weeklyTotals && weeklyResult ? (
              <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-6 text-sm text-slate-700 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
                  Weekly Result
                </h3>
                <div className="mt-4 grid gap-2">
                  <div className="flex items-center justify-between">
                    <span>{currentName}</span>
                    <span>{weeklyTotals.userA} ml</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{partnerName}</span>
                    <span>{weeklyTotals.userB} ml</span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-[#E3E8F5] bg-white/80 px-3 py-2 text-center text-xs font-medium text-slate-500">
                  {weeklyResult}
                </div>
              </div>
            ) : null
          ) : (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-6 text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
                Weekly Result
              </h3>
              <div className="mt-4 rounded-lg border border-[#E3E8F5] bg-white/80 px-3 py-2 text-center text-xs font-medium text-slate-500">
                Locked until week ends
              </div>
            </div>
          )}

          {resultSaveError ? (
            <p className="text-center text-xs font-medium text-rose-500">
              {resultSaveError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="group relative overflow-hidden rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm transition-colors hover:border-[#7FB8FF]/30 dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <span className="material-symbols-outlined text-9xl text-[#7FB8FF] rotate-12">
                  water_drop
                </span>
              </div>
              <BlurWrapper isLocked={isWeekLocked}>
                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={currentName}
                    sizeClassName="h-14 w-14"
                    borderClassName="border-2 border-[#7FB8FF] shadow-lg shadow-[#7FB8FF]/20"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{getPossessive(currentName)} Total</h3>
                  </div>
                  {isCurrentUserLeading ? (
                    <div className="ml-auto">
                      <span
                        className="material-symbols-outlined text-3xl text-yellow-500 drop-shadow-sm"
                        title="Highest Intake"
                      >
                        emoji_events
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="relative z-10 mb-6 flex flex-col gap-1">
                  <span className="text-5xl font-semibold tracking-tight text-slate-800 dark:text-slate-800">
                    {currentWeeklyLiters} <span className="text-2xl font-semibold text-slate-500">L</span>
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-600">
                    Weekly Total
                  </span>
                </div>
                <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-[#EEF7F1] dark:bg-[#f4f3ff]">
                  <div className="h-3 rounded-full bg-[#7FB8FF]" style={{ width: `${Math.min(100, Math.round((effectiveWeeklyTotals.userA / 28000) * 100))}%` }} />
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>{currentWeekStatus}</span>
                  <span>Avg: {currentWeeklyAverage} L/day</span>
                </div>
              </BlurWrapper>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm transition-colors hover:border-rose-200 dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:hover:border-rose-900/30">
              <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <span className="material-symbols-outlined text-9xl text-slate-400 -rotate-12">
                  water_drop
                </span>
              </div>
              <BlurWrapper isLocked={isWeekLocked}>
                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <UserAvatar
                    avatarUrl={partnerAvatarUrl}
                    name={partnerName}
                    sizeClassName="h-14 w-14"
                    borderClassName="border-2 border-[#E3E8F5] dark:border-[#dbe6f2]"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{getPossessive(partnerName)} Total</h3>
                  </div>
                  {isPartnerLeading ? (
                    <div className="ml-auto">
                      <span
                        className="material-symbols-outlined text-3xl text-yellow-500 drop-shadow-sm"
                        title="Highest Intake"
                      >
                        emoji_events
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="relative z-10 mb-6 flex flex-col gap-1">
                  <span className="text-5xl font-semibold tracking-tight text-slate-800 dark:text-slate-800">
                    {partnerWeeklyLiters} <span className="text-2xl font-semibold text-slate-500">L</span>
                  </span>
                  <span className="font-medium text-slate-500 dark:text-slate-600">
                    Weekly Total
                  </span>
                </div>
                <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-[#EEF7F1] dark:bg-[#f4f3ff]">
                  <div className="h-3 rounded-full bg-[#7FB8FF]/60" style={{ width: `${Math.min(100, Math.round((effectiveWeeklyTotals.userB / 28000) * 100))}%` }} />
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>{partnerWeekStatus}</span>
                  <span>Avg: {partnerWeeklyAverage} L/day</span>
                </div>
              </BlurWrapper>
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff] md:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:justify-between">
              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
                    {getPossessive(currentName)} Intake
                  </h4>
                  <span className="rounded bg-[#7FB8FF]/10 px-2 py-1 text-xs font-medium text-[#7FB8FF]">
                    {currentDaysAtGoalLabel}
                  </span>
                </div>
                <div className="grid h-32 grid-cols-7 items-end gap-2 md:gap-4">
                {weekDays.map((day) => {
                  const height = Math.min(100, Math.round((day.water / DAILY_GOAL_ML) * 100));
                  return (
                    <div key={day.date} className="group flex h-full flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-sm bg-[#7FB8FF]/40 transition-all duration-200 group-hover:bg-[#7FB8FF]"
                        style={{ height: `${height}%` }}
                        title={`${day.water} ml`}
                      />
                      <span className="text-xs font-semibold text-slate-500">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              </div>

              <div className="hidden w-px self-stretch bg-[#E3E8F5] dark:bg-[#eef7ff] md:block" />

              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
                    {getPossessive(partnerName)} Intake
                  </h4>
                  <span className="rounded bg-[#EEF7F1] px-2 py-1 text-xs font-medium text-slate-500 dark:bg-[#f4f3ff] dark:text-slate-600">
                    {partnerDaysAtGoalLabel}
                  </span>
                </div>
                <div className="grid h-32 grid-cols-7 items-end gap-2 md:gap-4">
                  {partnerWeekDays.map((day) => {
                    const height = Math.min(100, Math.round((day.water / DAILY_GOAL_ML) * 100));
                    return (
                      <div key={day.date} className="group flex h-full flex-col items-center justify-end gap-2">
                        <div
                          className="w-full rounded-t-sm bg-slate-400/40 transition-all duration-200 group-hover:bg-[#7FB8FF]/40"
                          style={{ height: `${height}%` }}
                          title={`${day.water} ml`}
                        />
                        <span className="text-xs font-semibold text-slate-500">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-600">
            <p>Great job this week! See you next Monday.</p>
          </div>

          <div className="rounded-xl border border-[#E3E8F5] bg-white/80 px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            Weekly total: {weeklyTotal} ml
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}

function BlurWrapper({ isLocked, children }: BlurWrapperProps) {
  const shouldBlur = !isLocked;

  return (
    <div className={`relative ${shouldBlur ? "pointer-events-none" : ""}`}>
      <div className={shouldBlur ? "blur-sm" : ""}>{children}</div>
      {shouldBlur ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-[#E3E8F5] bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
            Revealed after week ends
          </span>
        </div>
      ) : null}
    </div>
  );
}

type BlurWrapperProps = {
  isLocked: boolean;
  children: ReactNode;
};



