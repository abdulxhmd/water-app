import { describe, expect, it } from "vitest";
import { clampWater, MAX_DAILY_WATER_ML } from "./water";

describe("clampWater", () => {
  it("never returns a negative value", () => {
    expect(clampWater(-500)).toBe(0);
    expect(clampWater(-1)).toBe(0);
  });

  it("passes through a normal value unchanged", () => {
    expect(clampWater(1500)).toBe(1500);
  });

  it("caps at the daily maximum", () => {
    expect(clampWater(MAX_DAILY_WATER_ML + 5000)).toBe(MAX_DAILY_WATER_ML);
  });

  it("rounds fractional amounts", () => {
    expect(clampWater(250.6)).toBe(251);
    expect(clampWater(250.4)).toBe(250);
  });

  it("treats zero as valid", () => {
    expect(clampWater(0)).toBe(0);
  });
});
