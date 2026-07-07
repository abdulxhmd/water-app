import type { WeeklyResultRow } from "@/lib/types";

export type WeeklyTotals = { userA: number; userB: number };

export function getWeeklyWinner(
  totals: WeeklyTotals | null,
  userAId: string,
  userBId: string
): string {
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

export function getWeeklyResult(
  winner: string,
  userAId: string,
  userBId: string,
  userAName: string,
  userBName: string
): string {
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

export type WeeklyResultPartialRow = Omit<WeeklyResultRow, "week_start" | "week_end">;

/**
 * A stored weekly_results row doesn't know which side of the pair is "the
 * current user" — user_a/user_b are just whichever order the row was
 * inserted in. This remaps it to (current user, partner) regardless of
 * which one was originally user_a.
 */
export function mapWeeklyResultRowToCurrent(
  row: WeeklyResultPartialRow,
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
