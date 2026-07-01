"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

type DailyWaterEntry = {
  user_id: string;
  date: string;
  water_ml: number;
};

type WeeklyResult = {
  week_start: string;
  week_end: string;
  user_a_id: string;
  user_b_id: string;
  user_a_total: number | null;
  user_b_total: number | null;
  winner: string | null;
};

export default function WeekPage() {
  const [weekEntries, setWeekEntries] = useState<DailyWaterEntry[]>([]);
  const [partnerWeekEntries, setPartnerWeekEntries] = useState<DailyWaterEntry[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<{
    userA: number;
    userB: number;
  } | null>(null);
  const [weeklyWinnerState, setWeeklyWinnerState] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const USER_A = userId ?? "";
  const USER_B = partnerId ?? "";
  const { currentName, partnerName } = getUserNames(user?.email);

  const { startDate, endDate } = getWeekRange(new Date());
  const endOfWeek = new Date(endDate);
  endOfWeek.setHours(23, 59, 59, 999);
  const isWeekLocked = new Date() > endOfWeek;

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
    if (loading || !userId) {
      return;
    }

    const loadPair = async () => {
      const { data, error } = await supabase
        .from("user_pairs")
        .select("user_a_id, user_b_id")
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .maybeSingle();

      if (error) {
        console.error("Error loading user pair:", error);
        return;
      }

      if (!data) {
        setPartnerId(null);
        return;
      }

      const nextPartnerId = data.user_a_id === userId
        ? data.user_b_id
        : data.user_a_id;
      setPartnerId(nextPartnerId);
    };

    loadPair();
  }, [loading, userId]);

  useEffect(() => {
    if (loading || !userId) {
      return;
    }

    const loadWeekEntries = async () => {
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
        return;
      }

      const entries = data ?? [];
      setWeekEntries(entries.filter((entry) => entry.user_id === userId));
      setPartnerWeekEntries(entries.filter((entry) => entry.user_id === partnerId));
    };

    loadWeekEntries();
  }, [loading, partnerId, startDate, endDate, userId]);

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

  useEffect(() => {
    if (!isWeekLocked || loading || !user || !partnerId) {
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
        alert("Something went wrong saving data");
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
          <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-[#dbe6f2] sm:h-10 sm:w-10">
            <img
              alt="User profile avatar"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP60wc5__59JcCKoCBN6laMSj7hjBCFojEE-MMdD5GxSHqFGTOwA-9kZW5-nKUo4g23NbyDBtz1HI1MQx3gWpaTEopoXajDEtfbIw8LvDvyJdTHpxvCASMdetqIg6qA_n5p3akG7eyrTOqNM2U15njQlP1cA3v2CvQze-bFOO2lB-w1ealODDirVJIE549PS_WKOi1uYgrjYEAcrtDI2EpPlYMZk-B6xMVdHgPVWCtF_moGiEmyyRUf8auQAEtVdwBe_EPn1T3cDI"
            />
          </div>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100vh-72px)] flex-col items-center justify-start overflow-hidden px-4 py-8 lg:py-12">
        <input
          id="lock-toggle"
          type="checkbox"
          className="peer hidden"
          disabled={isWeekLocked}
        />
        <label
          htmlFor="lock-toggle"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[#E3E8F5] bg-white px-4 py-2 text-xs font-semibold shadow-lg transition-colors dark:border-[#dbe6f2] dark:bg-[#eef7ff] ${
            isWeekLocked
              ? "cursor-not-allowed opacity-60"
              : "hover:bg-[#EEF7F1] dark:hover:bg-[#e1f0ff]"
          }`}
        >
          <span className="material-symbols-outlined text-sm">lock_open</span>
          {isWeekLocked ? "Week Locked" : "Toggle Lock View"}
        </label>

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
                disabled={isWeekLocked}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#E3E8F5] bg-white text-slate-500 shadow-sm transition-colors dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-600 ${
                  isWeekLocked
                    ? "cursor-not-allowed opacity-60"
                    : "hover:border-[#7FB8FF] hover:text-[#7FB8FF]"
                }`}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="px-2 text-sm font-medium text-slate-500 dark:text-slate-600">
                {weekDateLabel}
              </span>
              <button
                disabled={isWeekLocked}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#E3E8F5] bg-white text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-600 ${
                  isWeekLocked ? "cursor-not-allowed opacity-60" : "opacity-50"
                }`}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          {isWeekLocked ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 px-4 py-3 text-center text-sm text-slate-500 shadow-sm">
              This week's results are locked. Changes are no longer allowed.
            </div>
          ) : null}

          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#7FB8FF]/20 bg-gradient-to-r from-[#7FB8FF]/10 to-transparent p-6 text-center md:flex-row md:text-left">
            <div>
              <h2 className="mb-1 text-xl font-semibold text-slate-800 dark:text-slate-800 md:text-2xl">
                You both did wonderful this week.
              </h2>
              <p className="text-slate-500 dark:text-slate-600">
                Staying hydrated together keeps the bond strong.
              </p>
            </div>
            <div className="flex items-center -space-x-3">
              <img
                alt={`${currentName} profile`}
                className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-[#232d33]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3rbduhf7LFgOC2qEtCxt1lUrgFA7lWOtWGro_3zvinOs8ZLf3XwPa2zgNmh9oXve9IbWVCgX9RuDy01H5cvVjSomQI164GC0khFKFAQn7QIZas1RQ62eYbqnMfY16Z2bF8sR8KE4OhqNZxWZuIt2TFbsYfHWfItcQDG1X8PzwdyYuboIUtPXL2P7Ko-6YMPXntV9ftzeYkjfYu7ypThJtWr_AChCGWqOv93o9GD-4eCbmweR_r7Ko3NaBRsB8zzmvdSGEmkUS07Q"
              />
              <img
                alt={`${partnerName} profile`}
                className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-[#232d33]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUoGlEYqSzxpfW-Juba-VT5pTgyFikYASlg9RKoVXVPdbhi25DYThFHMLsstztE-CiJKupYoxNGr_W_keRxoHiVW5M1J-qZ9uggHaZsYvUIEYPGSxqiSIawhsTeaDYFHzg4Nes5LOsngJDydyLXz9RxEv7DN36E7vtLv4LPLMxHPjgJmiKWdSKLv8W01glMh0FD-t9oqbAPBfTs3wInBwa3hzRkdgtUnzzCl9axSzmgjmIm4yi2d47wREpxcu5xOmjgJ55lIj7iNA"
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-emerald-600 dark:border-[#232d33] dark:bg-emerald-900 dark:text-emerald-300">
                <span className="material-symbols-outlined text-lg">check</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
              This Week
            </h3>
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
            <div className="mt-4 text-xs font-medium text-slate-500">
              {isWeekLocked ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[#E3E8F5] bg-white/80 px-3 py-1">
                  <span className="material-symbols-outlined text-sm text-slate-400">
                    lock
                  </span>
                  This week's results are locked
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="group relative overflow-hidden rounded-xl border border-[#E3E8F5] bg-white p-6 shadow-sm transition-colors hover:border-[#7FB8FF]/30 dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                <span className="material-symbols-outlined text-9xl text-[#7FB8FF] rotate-12">
                  water_drop
                </span>
              </div>
              <BlurWrapper isLocked={isWeekLocked}>
                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <img
                    alt={`${currentName} profile picture`}
                    className="h-14 w-14 rounded-full border-2 border-[#7FB8FF] object-cover shadow-lg shadow-[#7FB8FF]/20"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2ZoAPdqaCZ6eNqMTsH01QcRZdbTFUdeQtX9ZNTl-GQRAlE7btH-UZjRCYMSh3ZD2LYKnGGb5XEdkS1itNBiyj7dzmco2W13FrjXjImikGlrhJaAMIiDR9u-D75P1adCnzf4lwfHj9atl5Rpz9_RPdjEFa5Cqwkmfip4FIYoABIZrxxppjH4P08g_11R4w6OSwa8EroGjfi2Lmi0pjgUBMcF-cnQB2libE3fX5IkjME3pqW6kgPoNzsVgaQ4Xl-W7-0F_1dkS16Fo"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{currentName}&apos;s Total</h3>
                    <div className="w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <span className="material-symbols-outlined text-sm">
                        trending_up
                      </span>
                      +5% vs last week
                    </div>
                  </div>
                  <div className="ml-auto">
                    <span
                      className="material-symbols-outlined text-3xl text-yellow-500 drop-shadow-sm"
                      title="Highest Intake"
                    >
                      emoji_events
                    </span>
                  </div>
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
                  <img
                    alt={`${partnerName} profile picture`}
                    className="h-14 w-14 rounded-full border-2 border-[#E3E8F5] object-cover dark:border-[#dbe6f2]"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7qGWGk2RfduNan97hfoKUK1waAW6rernRvM514DgDJ13hDl4i6Xg56Zv--jfJcP2HmXtcXrfJ4JZ_491WHvK5dAODyFaA-bFRi4itl8pUnB1c7LYvddwhjfzEhRF1Bv1gMAaLbfkR7CEh9HjDUxWucXXonG__wynqDdfoPPdUZWGPI2vdlR8XSqbSe9_iBRdqzS5App2EO5MQiz6CdHo6Dopt1x5ts1M7UF7Ao67-SQyD1AUgfCIsaFIcOLM8o1HKUiqwde6bknU"
                  />
                  <div>
                    <h3 className="text-lg font-bold">{partnerName}&apos;s Total</h3>
                    <div className="w-fit rounded-full bg-rose-50 px-2 py-0.5 text-sm font-medium text-rose-500 dark:bg-rose-900/20 dark:text-rose-400">
                      <span className="material-symbols-outlined text-sm">
                        trending_down
                      </span>
                      -2% vs last week
                    </div>
                  </div>
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
                    {currentName}&apos;s Intake
                  </h4>
                  <span className="rounded bg-[#7FB8FF]/10 px-2 py-1 text-xs font-medium text-[#7FB8FF]">
                    Perfect Week!
                  </span>
                </div>
                <div className="grid h-32 grid-cols-7 items-end gap-2 md:gap-4">
                {weekDays.map((day) => {
                  const height = Math.min(100, Math.round((day.water / 4000) * 100));
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
                    {partnerName}&apos;s Intake
                  </h4>
                  <span className="rounded bg-[#EEF7F1] px-2 py-1 text-xs font-medium text-slate-500 dark:bg-[#f4f3ff] dark:text-slate-600">
                    Keep it up!
                  </span>
                </div>
                <div className="grid h-32 grid-cols-7 items-end gap-2 md:gap-4">
                  {partnerWeekDays.map((day) => {
                    const height = Math.min(100, Math.round((day.water / 4000) * 100));
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

        <div className="pointer-events-none invisible absolute inset-0 z-20 flex items-center justify-center bg-white/30 p-6 opacity-0 transition-opacity duration-500 peer-checked:pointer-events-auto peer-checked:visible peer-checked:opacity-100 dark:bg-[#e6f0ff]/60">
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-[#E3E8F5] bg-white p-8 text-center shadow-2xl dark:border-[#dbe6f2] dark:bg-[#eef7ff] md:p-12">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-[#7FB8FF]/10 text-[#7FB8FF]">
              <span className="material-symbols-outlined text-4xl">lock</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-800">
              Results Locked
            </h2>
            <p className="leading-relaxed text-slate-500 dark:text-slate-600">
              This week&apos;s results are still brewing. Keep drinking water and
              check back Sunday night for the big reveal!
            </p>
            <div className="mt-2 flex h-10 w-full items-center justify-center rounded-lg border border-[#E3E8F5] bg-[#EEF7F1] text-sm font-medium text-slate-500 dark:border-[#dbe6f2] dark:bg-[#f4f3ff] dark:text-slate-600">
              Unlocks Sunday at 8:00 PM
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#E3E8F5] bg-white/70 px-4 py-6 text-xs text-slate-500 backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/70 dark:text-slate-600 sm:px-6 lg:px-10">
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
    </div>
  );
}

function getWeekRange(date: Date) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const dayIndex = current.getDay();
  const daysFromMonday = (dayIndex + 6) % 7;

  const start = new Date(current);
  start.setDate(current.getDate() - daysFromMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildWeekDays(startDate: string, entries: DailyWaterEntry[]) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDate = new Map(entries.map((entry) => [entry.date, entry.water_ml]));
  const start = new Date(startDate);

  return labels.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateKey = current.toISOString().slice(0, 10);

    return {
      label,
      date: dateKey,
      water: byDate.get(dateKey) ?? 0,
    };
  });
}

function getWeeklyWinner(
  totals: { userA: number; userB: number } | null,
  userAId: string,
  userBId: string
) {
  if (!totals) {
    return "";
  }
  if (totals.userA > totals.userB) {
    return userAId;
  }
  if (totals.userB > totals.userA) {
    return userBId;
  }
  return "tie";
}

function getWeeklyResult(
  winner: string,
  userAId: string,
  userBId: string,
  userAName: string,
  userBName: string
) {
  if (!winner) {
    return "";
  }
  if (winner === "tie") {
    return "It's a tie";
  }
  if (winner === userAId) {
    return `Winner: ${userAName}`;
  }
  if (winner === userBId) {
    return `Winner: ${userBName}`;
  }
  return "Winner: TBD";
}

function mapWeeklyResultRowToCurrent(
  row: WeeklyResult,
  currentUserId: string,
  partnerId: string
) {
  if (row.user_a_id === currentUserId && row.user_b_id === partnerId) {
    return {
      userATotal: row.user_a_total ?? 0,
      userBTotal: row.user_b_total ?? 0,
      winner: row.winner ?? "",
    };
  }

  if (row.user_a_id === partnerId && row.user_b_id === currentUserId) {
    return {
      userATotal: row.user_b_total ?? 0,
      userBTotal: row.user_a_total ?? 0,
      winner: row.winner ?? "",
    };
  }

  return null;
}

function formatShortDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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

  return { currentName: "You", partnerName: "Partner" };
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



