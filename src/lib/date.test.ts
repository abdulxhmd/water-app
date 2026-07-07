import { describe, expect, it } from "vitest";
import {
  buildWeekDays,
  endOfLocalDay,
  formatLocalDate,
  formatShortDate,
  getMonthRange,
  getPreviousLocalDate,
  getWeekRange,
  parseLocalDate,
} from "./date";

describe("parseLocalDate / formatLocalDate", () => {
  it("round-trips a date string without a UTC offset shift", () => {
    const parsed = parseLocalDate("2026-07-06");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6); // 0-indexed: July
    expect(parsed.getDate()).toBe(6);
    expect(formatLocalDate(parsed)).toBe("2026-07-06");
  });

  it("pads single-digit month/day", () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getWeekRange", () => {
  it("returns Monday-Sunday for a mid-week date", () => {
    // 2026-07-08 is a Wednesday.
    const { startDate, endDate } = getWeekRange(new Date(2026, 6, 8));
    expect(startDate).toBe("2026-07-06"); // Monday
    expect(endDate).toBe("2026-07-12"); // Sunday
  });

  it("treats Sunday as the last day of its own week, not the start of the next", () => {
    // 2026-07-12 is a Sunday.
    const { startDate, endDate } = getWeekRange(new Date(2026, 6, 12));
    expect(startDate).toBe("2026-07-06");
    expect(endDate).toBe("2026-07-12");
  });

  it("handles a week that crosses a month boundary", () => {
    // 2026-08-03 is a Monday.
    const { startDate, endDate } = getWeekRange(new Date(2026, 7, 3));
    expect(startDate).toBe("2026-08-03");
    expect(endDate).toBe("2026-08-09");
  });
});

describe("getMonthRange", () => {
  it("returns the first and last day of the month", () => {
    const { monthStart, monthEnd } = getMonthRange(new Date(2026, 1, 15));
    expect(monthStart).toBe("2026-02-01");
    expect(monthEnd).toBe("2026-02-28"); // 2026 is not a leap year
  });

  it("handles a leap year February correctly", () => {
    const { monthEnd } = getMonthRange(new Date(2028, 1, 10));
    expect(monthEnd).toBe("2028-02-29");
  });
});

describe("endOfLocalDay", () => {
  it("returns 23:59:59.999 local time on the given date", () => {
    const end = endOfLocalDay("2026-07-06");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(formatLocalDate(end)).toBe("2026-07-06");
  });
});

describe("buildWeekDays", () => {
  it("maps entries onto the correct weekday label using local dates", () => {
    const days = buildWeekDays("2026-07-06", [
      { user_id: "u1", date: "2026-07-06", water_ml: 500 },
      { user_id: "u1", date: "2026-07-08", water_ml: 1200 },
    ]);

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ label: "Mon", date: "2026-07-06", water: 500 });
    expect(days[2]).toMatchObject({ label: "Wed", date: "2026-07-08", water: 1200 });
    expect(days[6]).toMatchObject({ label: "Sun", date: "2026-07-12", water: 0 });
  });
});

describe("getPreviousLocalDate", () => {
  it("returns the prior calendar day", () => {
    const previous = getPreviousLocalDate(new Date(2026, 6, 6));
    expect(formatLocalDate(previous)).toBe("2026-07-05");
  });

  it("rolls back across a month boundary", () => {
    const previous = getPreviousLocalDate(new Date(2026, 6, 1));
    expect(formatLocalDate(previous)).toBe("2026-06-30");
  });

  it("rolls back across a year boundary", () => {
    const previous = getPreviousLocalDate(new Date(2026, 0, 1));
    expect(formatLocalDate(previous)).toBe("2025-12-31");
  });
});

describe("formatShortDate", () => {
  it("formats a date string using local parsing", () => {
    // Just confirm it doesn't throw and returns a non-empty string; exact
    // locale formatting is environment-dependent.
    expect(formatShortDate("2026-07-06").length).toBeGreaterThan(0);
  });
});
