import { describe, expect, it } from "vitest";
import { getMonthlyStandings, mapMonthlyResultRowToCurrent } from "./monthlyResult";

const USER_A = "user-a-id";
const USER_B = "user-b-id";

describe("getMonthlyStandings", () => {
  it("has userA leading when userA has more wins", () => {
    const standings = getMonthlyStandings(3, 1, USER_A, USER_B, "Shahul", "Shaima");
    expect(standings).toEqual({
      winner: USER_A,
      status: "Shahul is leading",
      winnerName: "Shahul",
    });
  });

  it("has userB leading when userB has more wins", () => {
    const standings = getMonthlyStandings(1, 3, USER_A, USER_B, "Shahul", "Shaima");
    expect(standings).toEqual({
      winner: USER_B,
      status: "Shaima is leading",
      winnerName: "Shaima",
    });
  });

  it("reports no leader on a tie", () => {
    const standings = getMonthlyStandings(2, 2, USER_A, USER_B, "Shahul", "Shaima");
    expect(standings).toEqual({
      winner: "tie",
      status: "No leader yet",
      winnerName: "No leader yet",
    });
  });

  it("reports no leader when both have zero wins", () => {
    const standings = getMonthlyStandings(0, 0, USER_A, USER_B, "Shahul", "Shaima");
    expect(standings.winner).toBe("tie");
  });
});

describe("mapMonthlyResultRowToCurrent", () => {
  const baseRow = {
    user_a_id: USER_A,
    user_b_id: USER_B,
    user_a_wins: 3,
    user_b_wins: 1,
    winner: USER_A,
  };

  it("passes wins through unchanged when the row's user_a is the current user", () => {
    const mapped = mapMonthlyResultRowToCurrent(baseRow, USER_A, USER_B);
    expect(mapped).toEqual({ userAWins: 3, userBWins: 1, winner: USER_A });
  });

  it("swaps wins when the row's user_a is actually the partner", () => {
    const mapped = mapMonthlyResultRowToCurrent(baseRow, USER_B, USER_A);
    expect(mapped).toEqual({ userAWins: 1, userBWins: 3, winner: USER_A });
  });

  it("returns null for an unrelated pair", () => {
    expect(mapMonthlyResultRowToCurrent(baseRow, "x", "y")).toBeNull();
  });

  it("defaults null wins/winner to safe fallbacks", () => {
    const mapped = mapMonthlyResultRowToCurrent(
      { user_a_id: USER_A, user_b_id: USER_B, user_a_wins: null, user_b_wins: null, winner: null },
      USER_A,
      USER_B
    );
    expect(mapped).toEqual({ userAWins: 0, userBWins: 0, winner: "tie" });
  });
});
