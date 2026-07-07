import type { MonthlyResultRow } from "@/lib/types";

export type MonthlyStandings = {
  /** userAId, userBId, or "tie" */
  winner: string;
  status: string;
  winnerName: string;
};

export function getMonthlyStandings(
  userAWins: number,
  userBWins: number,
  userAId: string,
  userBId: string,
  userAName: string,
  userBName: string
): MonthlyStandings {
  if (userAWins > userBWins) {
    return { winner: userAId, status: `${userAName} is leading`, winnerName: userAName };
  }
  if (userBWins > userAWins) {
    return { winner: userBId, status: `${userBName} is leading`, winnerName: userBName };
  }
  return { winner: "tie", status: "No leader yet", winnerName: "No leader yet" };
}

export type MonthlyResultPartialRow = Omit<MonthlyResultRow, "month_start" | "month_end">;

/**
 * A stored monthly_results row doesn't know which side of the pair is "the
 * current user" — this remaps it to (current user, partner) regardless of
 * which one was originally user_a.
 */
export function mapMonthlyResultRowToCurrent(
  row: MonthlyResultPartialRow,
  currentUserId: string,
  partnerId: string
) {
  if (row.user_a_id === currentUserId && row.user_b_id === partnerId) {
    return {
      userAWins: row.user_a_wins ?? 0,
      userBWins: row.user_b_wins ?? 0,
      winner: row.winner ?? "tie",
    };
  }

  if (row.user_a_id === partnerId && row.user_b_id === currentUserId) {
    return {
      userAWins: row.user_b_wins ?? 0,
      userBWins: row.user_a_wins ?? 0,
      winner: row.winner ?? "tie",
    };
  }

  return null;
}
