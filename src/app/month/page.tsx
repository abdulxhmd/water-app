"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { endOfLocalDay, getMonthRange, parseLocalDate } from "@/lib/date";
import { getUserNames } from "@/lib/users";
import { useProfile } from "@/lib/useProfile";
import { usePartner } from "@/lib/usePartner";
import UserAvatar from "@/components/UserAvatar";
import PageFooter from "@/components/PageFooter";
import type { WeeklyResultRow } from "@/lib/types";
import { getMonthlyStandings, mapMonthlyResultRowToCurrent } from "@/lib/monthlyResult";

type WeeklyResult = WeeklyResultRow;

export default function MonthPage() {
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([]);
  const [isLoadingWeeklyResults, setIsLoadingWeeklyResults] = useState(true);
  const [monthlyResult, setMonthlyResult] = useState<{
    userAWins: number;
    userBWins: number;
    winner: string;
  } | null>(null);
  const [resultSaveError, setResultSaveError] = useState<string | null>(null);
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const { partnerId, isLoaded: isPartnerLoaded } = usePartner(userId, loading);
  const USER_A = userId ?? "";
  const USER_B = partnerId ?? "";
  const { currentName, partnerName } = getUserNames(user?.email);
  const avatarUrl = useProfile(userId);
  const partnerAvatarUrl = useProfile(partnerId);
  const { monthStart, monthEnd } = getMonthRange(new Date());
  const monthName = parseLocalDate(monthStart).toLocaleDateString(undefined, {
    month: "long",
  });
  const isMonthLocked = new Date() > endOfLocalDay(monthEnd);

  const userAWins = weeklyResults.filter(
    (result) => result.winner === USER_A
  ).length;
  const userBWins = weeklyResults.filter(
    (result) => result.winner === USER_B
  ).length;
  const tieWeeks = weeklyResults.filter(
    (result) => result.winner === "tie"
  ).length;
  const effectiveUserAWins = monthlyResult?.userAWins ?? userAWins;
  const effectiveUserBWins = monthlyResult?.userBWins ?? userBWins;
  const { winner: monthlyWinner, status: monthlyStatus, winnerName: monthlyWinnerName } =
    getMonthlyStandings(effectiveUserAWins, effectiveUserBWins, USER_A, USER_B, currentName, partnerName);
  const monthlyWinnerAvatarUrl =
    effectiveUserAWins > effectiveUserBWins
      ? avatarUrl
      : effectiveUserBWins > effectiveUserAWins
        ? partnerAvatarUrl
        : null;
  const currentUserId = userId;
  const isWishEnabled =
    isMonthLocked && !!currentUserId && monthlyWinner === currentUserId;

  const [wish, setWish] = useState<{ userId: string; wishText: string } | null>(null);
  const [wishDraft, setWishDraft] = useState("");
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [wishStatus, setWishStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isMonthLocked || loading || !user || !partnerId) {
      return;
    }

    const loadOrSaveMonthlyResult = async () => {
      const { data, error } = await supabase
        .from("monthly_results")
        .select("user_a_wins, user_b_wins, winner, user_a_id, user_b_id")
        .eq("month_start", monthStart)
        .eq("month_end", monthEnd)
        .or(`and(user_a_id.eq.${USER_A},user_b_id.eq.${USER_B}),and(user_a_id.eq.${USER_B},user_b_id.eq.${USER_A})`)
        .maybeSingle();

      if (error) {
        console.error("Error checking monthly result:", error);
        return;
      }

      if (data) {
        const mapped = mapMonthlyResultRowToCurrent(data, USER_A, USER_B);
        if (mapped) {
          setMonthlyResult(mapped);
        }
        return;
      }

      const { error: insertError } = await supabase
        .from("monthly_results")
        .insert({
          month_start: monthStart,
          month_end: monthEnd,
          user_a_id: USER_A,
          user_b_id: USER_B,
          user_a_wins: userAWins,
          user_b_wins: userBWins,
          winner: monthlyWinner,
        });

      if (insertError) {
        console.error("Error saving monthly result:", insertError);
        setResultSaveError("Could not save this month's result. It will retry next visit.");
        return;
      }

      setMonthlyResult({
        userAWins,
        userBWins,
        winner: monthlyWinner,
      });
    };

    loadOrSaveMonthlyResult();
  }, [
    USER_A,
    USER_B,
    isMonthLocked,
    loading,
    monthEnd,
    monthStart,
    monthlyWinner,
    partnerId,
    user,
    userId,
    userAWins,
    userBWins,
  ]);

  useEffect(() => {
    if (loading || !isPartnerLoaded) {
      return;
    }

    const loadMonthlyResults = async () => {
      if (!user || !partnerId) {
        setIsLoadingWeeklyResults(false);
        return;
      }

      setIsLoadingWeeklyResults(true);
      const { data, error } = await supabase
        .from("weekly_results")
        .select(
          "week_start, week_end, user_a_id, user_b_id, user_a_total, user_b_total, winner"
        )
        .or(`and(user_a_id.eq.${USER_A},user_b_id.eq.${USER_B}),and(user_a_id.eq.${USER_B},user_b_id.eq.${USER_A})`)
        .gte("week_start", monthStart)
        .lte("week_start", monthEnd)
        .order("week_start", { ascending: true });

      if (error) {
        console.error("Error loading monthly results:", error);
        setIsLoadingWeeklyResults(false);
        return;
      }

      setWeeklyResults(data ?? []);
      setIsLoadingWeeklyResults(false);
    };

    loadMonthlyResults();
  }, [USER_A, USER_B, isPartnerLoaded, loading, monthEnd, monthStart, partnerId, user, userId]);

  useEffect(() => {
    if (loading || !userId || !partnerId) {
      return;
    }

    const loadWish = async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select("user_id, wish_text")
        .eq("month_start", monthStart)
        .eq("month_end", monthEnd)
        .or(`and(user_id.eq.${USER_A},partner_id.eq.${USER_B}),and(user_id.eq.${USER_B},partner_id.eq.${USER_A})`)
        .maybeSingle();

      if (error) {
        console.error("Error loading wish:", error);
        return;
      }

      if (data) {
        setWish({ userId: data.user_id, wishText: data.wish_text });
      }
    };

    loadWish();
  }, [USER_A, USER_B, loading, monthStart, monthEnd, partnerId, userId]);

  const handleSubmitWish = async () => {
    const trimmedWish = wishDraft.trim();
    if (!userId || !partnerId || !trimmedWish) {
      return;
    }

    setIsSubmittingWish(true);
    setWishStatus(null);

    const { error } = await supabase.from("wishes").insert({
      month_start: monthStart,
      month_end: monthEnd,
      user_id: userId,
      partner_id: partnerId,
      wish_text: trimmedWish,
    });

    setIsSubmittingWish(false);

    if (error) {
      console.error("Error saving wish:", error);
      setWishStatus({ type: "error", message: "Could not send your wish." });
      return;
    }

    setWish({ userId, wishText: trimmedWish });
    setWishDraft("");
    setWishStatus({ type: "success", message: "Wish sent!" });

    supabase.functions
      .invoke("send-push", {
        body: {
          targetUserId: partnerId,
          title: "A wish arrived",
          body: trimmedWish,
          url: "/month",
        },
      })
      .catch((err) => {
        console.error("Error notifying partner:", err);
      });
  };

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-slate-800 transition-colors duration-200 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#E3E8F5] bg-white/80 px-4 py-4 backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/80 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7FB8FF]/10 text-[#7FB8FF]">
            <span className="material-symbols-outlined text-[22px]">water_drop</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-600">
              Water App
            </span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-800">
              Month
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

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-4xl flex-col gap-8">
          <section className="flex flex-col items-center justify-center space-y-6 pb-4 pt-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#7FB8FF]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-[#7FB8FF] dark:bg-[#7FB8FF]/20">
              <span className="material-symbols-outlined text-lg">trophy</span>
              {monthName} Champion
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-800 dark:text-slate-800 md:text-5xl">
              Monthly status: {monthlyStatus}
            </h1>
            <p className="max-w-lg text-lg text-slate-500 dark:text-slate-600 md:text-xl">
              Weeks completed: {weeklyResults.length}. Wins — {currentName}: {userAWins}, {partnerName}: {userBWins}
              {tieWeeks > 0 ? `, ties: ${tieWeeks}` : ""}.
            </p>
            {resultSaveError ? (
              <p className="text-xs font-medium text-rose-500">{resultSaveError}</p>
            ) : null}
          </section>

          {!isPartnerLoaded || isLoadingWeeklyResults ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              Loading this month&apos;s results…
            </div>
          ) : !partnerId ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              No partner is paired with your account yet, so there&apos;s nothing to
              compare. Ask whoever manages the app to set up your pairing.
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-12">
              <div className="group relative flex flex-col items-center rounded-xl border border-[#E3E8F5] bg-white p-8 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7FB8FF]/8 blur-3xl transition-all duration-700 group-hover:bg-[#7FB8FF]/15" />
                <div className="relative mb-6">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#7FB8FF] to-[#E9E2FF] blur opacity-40 transition duration-500 group-hover:opacity-75" />
                  {monthlyWinner === "tie" ? (
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-[#7FB8FF]/10 text-[#7FB8FF] shadow-xl dark:border-[#dbe6f2] md:h-40 md:w-40">
                      <span className="material-symbols-outlined text-5xl">
                        handshake
                      </span>
                    </div>
                  ) : (
                    <UserAvatar
                      avatarUrl={monthlyWinnerAvatarUrl}
                      name={monthlyWinnerName}
                      sizeClassName="h-32 w-32 md:h-40 md:w-40"
                      borderClassName="border-4 border-white shadow-xl dark:border-[#dbe6f2]"
                      className="text-4xl"
                    />
                  )}
                  <div className="absolute bottom-0 right-0 rounded-full border-4 border-white bg-[#7FB8FF] p-2 text-white shadow-lg dark:border-slate-900">
                    <span className="material-symbols-outlined text-xl">star</span>
                  </div>
                </div>
                <div className="mb-8 flex flex-col items-center gap-1">
                  <div className="text-2xl font-semibold text-slate-800 dark:text-slate-800">
                    {monthlyWinnerName}
                  </div>
                  <div className="text-slate-500 dark:text-slate-600">
                    Weeks completed:{" "}
                    <span className="text-[#7FB8FF]">{weeklyResults.length}</span>
                  </div>
                </div>
                <div className="flex w-full max-w-sm items-center justify-between rounded-lg border border-[#E3E8F5] bg-[#EEF7F1] p-4 dark:border-[#dbe6f2] dark:bg-[#eef7ff]/70">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-600">
                      Monthly leader
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-700">
                      {monthlyStatus}
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={currentName}
                      sizeClassName="h-8 w-8"
                      borderClassName="ring-2 ring-white dark:ring-slate-800"
                      className={
                        effectiveUserBWins > effectiveUserAWins
                          ? "grayscale opacity-70"
                          : ""
                      }
                    />
                    <UserAvatar
                      avatarUrl={partnerAvatarUrl}
                      name={partnerName}
                      sizeClassName="h-8 w-8"
                      borderClassName="ring-2 ring-white dark:ring-slate-800"
                      className={
                        effectiveUserAWins > effectiveUserBWins
                          ? "grayscale opacity-70"
                          : ""
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border border-[#E3E8F5] bg-white shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff] md:flex-row">
            <div className="relative flex w-full flex-col items-center justify-center gap-6 border-b border-[#E3E8F5] bg-[#7FB8FF]/5 p-8 text-center dark:border-[#dbe6f2] dark:bg-[#eef7ff] md:w-2/5 md:border-b-0 md:border-r md:p-12">
              <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(#7FB8FF_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="relative z-10 rounded-full bg-white p-6 shadow-sm transition-transform duration-300 hover:scale-105 dark:bg-slate-700">
                <span className="material-symbols-outlined text-6xl text-[#7FB8FF]">
                  redeem
                </span>
              </div>
              <div className="relative z-10">
                <h3 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-800">
                  {isWishEnabled ? "You've earned a wish" : "Monthly wish"}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-600">
                  {isMonthLocked
                    ? "What will it be? Unlock your reward and let your partner know."
                    : "Available once the month ends, for whoever's leading."}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col justify-center p-6 md:w-3/5 md:p-10">
              {wish ? (
                <div className="flex flex-col gap-4">
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-800">
                    {wish.userId === userId ? "Your wish" : `${monthlyWinnerName}'s wish`}
                  </span>
                  <p className="min-h-[100px] whitespace-pre-wrap rounded-xl border border-[#E3E8F5] bg-[#EEF7F1] p-4 text-base text-slate-800 dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-800">
                    {wish.wishText}
                  </p>
                </div>
              ) : (
                <>
                  <label className="mb-4 block">
                    <span className="mb-2 block text-base font-semibold text-slate-800 dark:text-slate-800">
                      Your Wish
                    </span>
                    <span className="mb-4 block text-sm text-slate-500 dark:text-slate-600">
                      Type your wish here. It could be a foot massage, movie night
                      choice, or a dinner date.
                    </span>
                    <div className="relative">
                      <textarea
                        disabled={!isWishEnabled || isSubmittingWish}
                        value={wishDraft}
                        onChange={(event) => setWishDraft(event.target.value)}
                        maxLength={500}
                        className="min-h-[140px] w-full resize-none rounded-xl border border-[#E3E8F5] bg-[#EEF7F1] p-4 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#7FB8FF] focus:ring-4 focus:ring-[#7FB8FF]/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-800"
                        placeholder="For example: I wish for a homemade pasta dinner tonight! 🍝"
                      />
                      <div className="absolute bottom-3 right-3">
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">
                          edit_note
                        </span>
                      </div>
                    </div>
                  </label>
                  <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs italic text-slate-400 dark:text-slate-500">
                      Your partner will be notified instantly.
                    </div>
                    <button
                      onClick={handleSubmitWish}
                      disabled={!isWishEnabled || isSubmittingWish || !wishDraft.trim()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] px-6 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all hover:-translate-y-0.5 hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{isSubmittingWish ? "Sending…" : "Send Wish"}</span>
                      <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                  </div>
                  {wishStatus ? (
                    <p className={`mt-2 text-xs font-medium ${wishStatus.type === "error" ? "text-rose-500" : "text-emerald-600"}`}>
                      {wishStatus.message}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
          </>
          )}

        </div>
      </main>

      <PageFooter />
    </div>
  );
}


