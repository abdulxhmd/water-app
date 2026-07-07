import { describe, expect, it } from "vitest";
import {
  getWeeklyResult,
  getWeeklyWinner,
  mapWeeklyResultRowToCurrent,
} from "./weeklyResult";

const USER_A = "user-a-id";
const USER_B = "user-b-id";

describe("getWeeklyWinner", () => {
  it("returns userAId when userA has the higher total", () => {
    expect(getWeeklyWinner({ userA: 3000, userB: 2000 }, USER_A, USER_B)).toBe(USER_A);
  });

  it("returns userBId when userB has the higher total", () => {
    expect(getWeeklyWinner({ userA: 1000, userB: 4000 }, USER_A, USER_B)).toBe(USER_B);
  });

  it("returns 'tie' when totals are equal", () => {
    expect(getWeeklyWinner({ userA: 2000, userB: 2000 }, USER_A, USER_B)).toBe("tie");
  });

  it("returns an empty string when totals are not yet known", () => {
    expect(getWeeklyWinner(null, USER_A, USER_B)).toBe("");
  });
});

describe("getWeeklyResult", () => {
  it("returns an empty string when there's no winner yet", () => {
    expect(getWeeklyResult("", USER_A, USER_B, "Shahul", "Shaima")).toBe("");
  });

  it("announces a tie", () => {
    expect(getWeeklyResult("tie", USER_A, USER_B, "Shahul", "Shaima")).toBe("It's a tie");
  });

  it("announces userA's name when userA wins", () => {
    expect(getWeeklyResult(USER_A, USER_A, USER_B, "Shahul", "Shaima")).toBe("Winner: Shahul");
  });

  it("announces userB's name when userB wins", () => {
    expect(getWeeklyResult(USER_B, USER_A, USER_B, "Shahul", "Shaima")).toBe("Winner: Shaima");
  });
});

describe("mapWeeklyResultRowToCurrent", () => {
  const baseRow = {
    user_a_id: USER_A,
    user_b_id: USER_B,
    user_a_total: 3000,
    user_b_total: 2000,
    winner: USER_A,
  };

  it("passes totals through unchanged when the row's user_a is the current user", () => {
    const mapped = mapWeeklyResultRowToCurrent(baseRow, USER_A, USER_B);
    expect(mapped).toEqual({ userATotal: 3000, userBTotal: 2000, winner: USER_A });
  });

  it("swaps totals when the row's user_a is actually the partner", () => {
    const mapped = mapWeeklyResultRowToCurrent(baseRow, USER_B, USER_A);
    expect(mapped).toEqual({ userATotal: 2000, userBTotal: 3000, winner: USER_A });
  });

  it("returns null when the row belongs to a different pair entirely", () => {
    const mapped = mapWeeklyResultRowToCurrent(baseRow, "someone-else", "another-person");
    expect(mapped).toBeNull();
  });

  it("defaults null totals/winner to safe fallbacks", () => {
    const mapped = mapWeeklyResultRowToCurrent(
      { user_a_id: USER_A, user_b_id: USER_B, user_a_total: null, user_b_total: null, winner: null },
      USER_A,
      USER_B
    );
    expect(mapped).toEqual({ userATotal: 0, userBTotal: 0, winner: "" });
  });
});
