"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { parseLocalDate } from "@/lib/date";
import { getUserNames } from "@/lib/users";
import { usePartner } from "@/lib/usePartner";
import UserAvatar from "@/components/UserAvatar";
import PageFooter from "@/components/PageFooter";
import { mapMonthlyResultRowToCurrent } from "@/lib/monthlyResult";
import type { MonthlyResultRow, WishRow } from "@/lib/types";

type HistoryMonth = {
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
  currentWins: number;
  partnerWins: number;
  winnerName: string;
  isTie: boolean;
  wish: WishRow | null;
};

export default function HistoryPage() {
  const { user, loading } = useUser();
  const userId = user?.id ?? null;
  const { partnerId, isLoaded: isPartnerLoaded } = usePartner(userId, loading);
  const { currentName, partnerName } = getUserNames(user?.email);
  const USER_A = userId ?? "";
  const USER_B = partnerId ?? "";

  const [months, setMonths] = useState<HistoryMonth[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [markingWishId, setMarkingWishId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !isPartnerLoaded) {
      return;
    }

    const loadHistory = async () => {
      if (!userId || !partnerId) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);

      const [monthlyResultsRes, wishesRes] = await Promise.all([
        supabase
          .from("monthly_results")
          .select("month_start, month_end, user_a_id, user_b_id, user_a_wins, user_b_wins, winner")
          .or(`and(user_a_id.eq.${USER_A},user_b_id.eq.${USER_B}),and(user_a_id.eq.${USER_B},user_b_id.eq.${USER_A})`)
          .order("month_start", { ascending: false }),
        supabase
          .from("wishes")
          .select("id, month_start, month_end, user_id, partner_id, wish_text, fulfilled, fulfilled_at, fulfillment_note")
          .or(`and(user_id.eq.${USER_A},partner_id.eq.${USER_B}),and(user_id.eq.${USER_B},partner_id.eq.${USER_A})`)
          .order("month_start", { ascending: false }),
      ]);

      if (monthlyResultsRes.error || wishesRes.error) {
        console.error(
          "Error loading history:",
          monthlyResultsRes.error || wishesRes.error
        );
        setHistoryError("Could not load your history. Please try again later.");
        setIsLoadingHistory(false);
        return;
      }

      const wishByMonth = new Map<string, WishRow>();
      for (const row of (wishesRes.data ?? []) as WishRow[]) {
        wishByMonth.set(`${row.month_start}_${row.month_end}`, row);
      }

      const merged: HistoryMonth[] = ((monthlyResultsRes.data ?? []) as MonthlyResultRow[])
        .map((row) => {
          const mapped = mapMonthlyResultRowToCurrent(row, USER_A, USER_B);
          if (!mapped) {
            return null;
          }

          const monthLabel = parseLocalDate(row.month_start).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          });
          const isTie = mapped.winner === "tie";
          const winnerName = isTie
            ? "Tie"
            : mapped.winner === USER_A
              ? currentName
              : partnerName;

          return {
            monthStart: row.month_start,
            monthEnd: row.month_end,
            monthLabel,
            currentWins: mapped.userAWins,
            partnerWins: mapped.userBWins,
            winnerName,
            isTie,
            wish: wishByMonth.get(`${row.month_start}_${row.month_end}`) ?? null,
          };
        })
        .filter((entry): entry is HistoryMonth => entry !== null);

      setMonths(merged);
      setIsLoadingHistory(false);
    };

    loadHistory();
  }, [USER_A, USER_B, currentName, isPartnerLoaded, loading, partnerId, partnerName, userId]);

  const handleMarkFulfilled = async (wish: WishRow) => {
    setMarkingWishId(wish.id);
    setHistoryError(null);

    const trimmedNote = (noteDrafts[wish.id] ?? "").trim();
    const { error } = await supabase
      .from("wishes")
      .update({
        fulfilled: true,
        fulfilled_at: new Date().toISOString(),
        fulfillment_note: trimmedNote || null,
      })
      .eq("id", wish.id);

    setMarkingWishId(null);

    if (error) {
      console.error("Error marking wish fulfilled:", error);
      setHistoryError("Could not mark that wish as fulfilled.");
      return;
    }

    setMonths((prev) =>
      prev.map((month) =>
        month.wish?.id === wish.id
          ? { ...month, wish: { ...wish, fulfilled: true, fulfillment_note: trimmedNote || null } }
          : month
      )
    );
  };

  const pendingWishMonths = months.filter((month) => month.wish && !month.wish.fulfilled);
  const completedWishMonths = months.filter((month) => month.wish && month.wish.fulfilled);

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-slate-800 transition-colors duration-200 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E8F5] bg-white/80 px-4 py-4 backdrop-blur-md dark:border-[#dbe6f2] dark:bg-[#eef7ff]/80 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7FB8FF]/10 text-[#7FB8FF]">
            <span className="material-symbols-outlined text-[22px]">history</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-600">
              Water App
            </span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-800">
              History
            </span>
          </div>
        </div>
        <Link
          href="/month"
          className="rounded-full bg-[#E9E2FF]/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-[#E9E2FF] dark:bg-white/70 dark:text-slate-800 dark:hover:bg-white/90"
        >
          Back to Month
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-3xl flex-col gap-8">
          {historyError ? (
            <p className="text-center text-xs font-medium text-rose-500">{historyError}</p>
          ) : null}

          {isLoadingHistory || !isPartnerLoaded ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              Loading your history…
            </div>
          ) : !partnerId ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              No partner is paired with your account yet, so there&apos;s no shared
              history to show.
            </div>
          ) : months.length === 0 ? (
            <div className="rounded-xl border border-[#E3E8F5] bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
              No completed months yet. Once a month ends, it&apos;ll show up here.
            </div>
          ) : (
            <>
              {pendingWishMonths.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                    Pending wishes ({pendingWishMonths.length})
                  </h2>
                  {pendingWishMonths.map((month) => (
                    <div
                      key={month.monthStart}
                      className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-800">
                          {month.monthLabel}
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-600">
                        {month.winnerName} won ({month.currentWins}–{month.partnerWins})
                      </p>
                      <p className="mt-3 whitespace-pre-wrap rounded-lg border border-[#E3E8F5] bg-white p-3 text-sm text-slate-800 dark:border-[#dbe6f2]">
                        {month.wish?.wish_text}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        <textarea
                          value={noteDrafts[month.wish!.id] ?? ""}
                          onChange={(event) =>
                            setNoteDrafts((prev) => ({ ...prev, [month.wish!.id]: event.target.value }))
                          }
                          maxLength={300}
                          placeholder="Optional note about how it was fulfilled…"
                          className="min-h-[60px] w-full resize-none rounded-lg border border-[#E3E8F5] bg-white p-3 text-sm text-slate-700 outline-none focus:border-[#7FB8FF] dark:border-[#dbe6f2]"
                        />
                        <button
                          onClick={() => handleMarkFulfilled(month.wish!)}
                          disabled={markingWishId === month.wish!.id}
                          className="self-start rounded-full bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {markingWishId === month.wish!.id ? "Saving…" : "Mark as fulfilled"}
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-600">
                  All months ({months.length})
                </h2>
                {months.map((month) => (
                  <div
                    key={month.monthStart}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#E3E8F5] bg-white p-5 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]"
                  >
                    <div className="flex items-center gap-4">
                      {month.isTie ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7FB8FF]/10 text-[#7FB8FF]">
                          <span className="material-symbols-outlined text-xl">handshake</span>
                        </div>
                      ) : (
                        <UserAvatar
                          avatarUrl={null}
                          name={month.winnerName}
                          sizeClassName="h-10 w-10"
                        />
                      )}
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-800">{month.monthLabel}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-600">
                          {month.isTie ? "Tied" : `${month.winnerName} won`} ({month.currentWins}–{month.partnerWins})
                        </p>
                      </div>
                    </div>
                    {month.wish ? (
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          month.wish.fulfilled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {month.wish.fulfilled ? "Wish fulfilled" : "Wish pending"}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        No wish
                      </span>
                    )}
                  </div>
                ))}
              </section>

              {completedWishMonths.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                    Completed wishes ({completedWishMonths.length})
                  </h2>
                  {completedWishMonths.map((month) => (
                    <div
                      key={month.monthStart}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-800">
                          {month.monthLabel}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Fulfilled
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[#E3E8F5] bg-white p-3 text-sm text-slate-800 dark:border-[#dbe6f2]">
                        {month.wish?.wish_text}
                      </p>
                      {month.wish?.fulfillment_note ? (
                        <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-600">
                          {month.wish.fulfillment_note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>

      <PageFooter />
    </div>
  );
}
