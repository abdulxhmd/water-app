import { describe, expect, it } from "vitest";
import { buildCredentials, buildPassword, isValidPin } from "./credentials";

describe("buildCredentials", () => {
  it("normalizes the name to lowercase and trims whitespace", () => {
    const { email } = buildCredentials("  Shahul  ", "1234");
    expect(email).toBe("shahul@water.app");
  });

  it("builds the password from the pin using the expected scheme", () => {
    const { password } = buildCredentials("shaima", "0007");
    expect(password).toBe("water-0007-lock");
  });

  it("matches buildPassword for the same pin", () => {
    const { password } = buildCredentials("anyone", "4321");
    expect(password).toBe(buildPassword("4321"));
  });
});

describe("isValidPin", () => {
  it("accepts exactly 4 single digits", () => {
    expect(isValidPin(["1", "2", "3", "4"])).toBe(true);
  });

  it("rejects fewer than 4 digits", () => {
    expect(isValidPin(["1", "2", "3"])).toBe(false);
  });

  it("rejects empty entries", () => {
    expect(isValidPin(["1", "", "3", "4"])).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(isValidPin(["1", "a", "3", "4"])).toBe(false);
  });
});
