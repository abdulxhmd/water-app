"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

type WeeklyResult = {
  week_start: string;
  week_end: string;
  user_a_id: string;
  user_b_id: string;
  user_a_total: number;
  user_b_total: number;
  winner: string;
};

export default function MonthPage() {
  const [weeklyResults, setWeeklyResults] = useState<WeeklyResult[]>([]);
  const [monthlyResult, setMonthlyResult] = useState<{
    userAWins: number;
    userBWins: number;
    winner: string;
  } | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const USER_A = userId ?? "";
  const USER_B = partnerId ?? "";
  const { currentName, partnerName } = getUserNames(user?.email);
  const { monthStart, monthEnd } = getMonthRange(new Date());
  const monthName = new Date(monthStart).toLocaleDateString(undefined, {
    month: "long",
  });
  const endOfMonth = new Date(monthEnd);
  endOfMonth.setHours(23, 59, 59, 999);
  const isMonthLocked = new Date() > endOfMonth;

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
  const monthlyStatus =
    effectiveUserAWins > effectiveUserBWins
      ? `${currentName} is leading`
      : effectiveUserBWins > effectiveUserAWins
        ? `${partnerName} is leading`
        : "No leader yet";
  const monthlyWinner =
    effectiveUserAWins > effectiveUserBWins
      ? USER_A
      : effectiveUserBWins > effectiveUserAWins
        ? USER_B
        : "tie";
  const monthlyWinnerName =
    effectiveUserAWins > effectiveUserBWins
      ? currentName
      : effectiveUserBWins > effectiveUserAWins
        ? partnerName
        : "No leader yet";
  const currentUserId = userId;
  const isWishEnabled =
    isMonthLocked && !!currentUserId && monthlyWinner === currentUserId;

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
        alert("Something went wrong saving data");
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
    if (loading || !user || !partnerId) {
      return;
    }

    const loadMonthlyResults = async () => {
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
        return;
      }

      setWeeklyResults(data ?? []);
    };

    loadMonthlyResults();
  }, [USER_A, USER_B, loading, monthEnd, monthStart, partnerId, user, userId]);

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
          <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-[#dbe6f2] sm:h-10 sm:w-10">
            <img
              alt="User profile avatar"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIe4xJ3NQklg6TjFJB9jG_DVWW-_74hxLYA-9y5v-Rh9mIXkVKO4FlROp-5SKbqXUN0enafHlrCr6FIU0yy7bKlk1uRZ8hMTNRkmBvqCcM_fYequVRFSSfy2Qx0H6v9biZAO8LPEtUFZOB2TE7B_r1xpY_rv9IhtdwTYvm2sK0YCQSQ8nLKz7dtvWvuGR2IeorTtNsu8f_OR5nn_wnaxU5f8xq4BjYElx9y8DviJw21oPED4K6LPvaDETOkGbWH-CmoER83pXxPzE"
            />
          </div>
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
              Weeks completed: {weeklyResults.length}. {currentName} wins: {userAWins}. {partnerName}
              wins: {userBWins}.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-12">
              <div className="group relative flex flex-col items-center rounded-xl border border-[#E3E8F5] bg-white p-8 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7FB8FF]/8 blur-3xl transition-all duration-700 group-hover:bg-[#7FB8FF]/15" />
                <div className="relative mb-6">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#7FB8FF] to-[#E9E2FF] blur opacity-40 transition duration-500 group-hover:opacity-75" />
                  <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-xl dark:border-[#dbe6f2] md:h-40 md:w-40">
                    <img
                      alt="Winner avatar smiling cheerfully"
                      className="h-full w-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCB1wGugCf72eb069amKiexqfw_7vMax82-TGOtrjF0VoT8N7lSlRbKppUkltFRZFGuBgbWButpvtMyamRfXVk_lgbBL0UCYjb_IBUdKGiZqlUWn2jei0rG9KtjNd-XB-QD5yyv1vJdDOBtg3HBBiujUF-67FlOG4OCnb6xdRa2-LUXapKMERNp0fsbb5yL4vkBsXvVcDQl4sUJrRmzBsOg2b-KpZjnsnIJsGM3shRdZPEMwcVFmxufv9VHn1UDNShPaLtLD5Jq6EA"
                    />
                  </div>
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
                    <img
                      alt="Small avatar of winner"
                      className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8jwKdhSATYdSdD6pkWpkP_8tl2YeSU18V06SHSQGVIqVpHLTrr2WMvLnpDZ0CE2Q7bmbkK0zR4qJqYB6lbMnjb_F_VNRK6hU212v5JtGkHJavdjvbaj8ICXRZz83QtJ0GI3NHgeeyqqA5xblGkdA6K0WYzEfArka66KWN0XtGe-Qr5SNs8VUWhM9LVYv5h_sNfGeXeM4I_I_BJlyWCpJoawHMmqge5q36Vxwsfs9FZsPHcP3lCyDRk_jh1JHTRU2twQ1lj_BoZ1k"
                    />
                    <img
                      alt="Small avatar of runner up"
                      className="h-8 w-8 rounded-full ring-2 ring-white grayscale opacity-70 dark:ring-slate-800"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuApTw5_rZwNNlRHa63wUQokGByxwNB2jz2PGa-BgTog-6KO-t4dJlE-ef8nc2yHq9v8BJv0yujmT8N8VB5a_5ejhagctTC3Ivv_zG-_bZ23NQMBOckWX7rZiTpEOZSMPbHz8IABJcPlJUkBkU-d09FSfYDpeUYBw2wQAi_nHVzg9Axb7gkiwqhLbWgqC9dgoBT5SF5qF0NlLam0AzAnSXOpxOEC-QjOl34CL3JhtsR3igXPPz5VNKdwZwFGFbnDU-YOYlh3qo-rdoE"
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
                  You&apos;ve earned a wish
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-600">
                  What will it be? Unlock your reward and let your partner know.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col justify-center p-6 md:w-3/5 md:p-10">
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
                    disabled={!isWishEnabled}
                    className="min-h-[140px] w-full resize-none rounded-xl border border-[#E3E8F5] bg-[#EEF7F1] p-4 text-base text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-[#7FB8FF] focus:ring-4 focus:ring-[#7FB8FF]/20 dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-800"
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
                  disabled={!isWishEnabled}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] px-6 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all hover:-translate-y-0.5 hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>Send Wish</span>
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </div>
          </div>

          <div className="py-6 text-center">
            <a
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-[#7FB8FF] dark:text-slate-500 dark:hover:text-[#7FB8FF]"
              href="#"
            >
              <span className="material-symbols-outlined text-lg">history</span>
              View previous monthly winners
            </a>
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

function getMonthRange(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    monthStart: formatLocalDate(monthStart),
    monthEnd: formatLocalDate(monthEnd),
  };
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function mapMonthlyResultRowToCurrent(
  row: WeeklyResult,
  currentUserId: string,
  partnerId: string
) {
  if (row.user_a_id === currentUserId && row.user_b_id === partnerId) {
    return {
      userAWins: row.user_a_total ?? 0,
      userBWins: row.user_b_total ?? 0,
      winner: row.winner ?? "tie",
    };
  }

  if (row.user_a_id === partnerId && row.user_b_id === currentUserId) {
    return {
      userAWins: row.user_b_total ?? 0,
      userBWins: row.user_a_total ?? 0,
      winner: row.winner ?? "tie",
    };
  }

  return null;
}



