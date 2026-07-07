import { describe, expect, it } from "vitest";
import { HYDRATION_MESSAGES, getRandomHydrationMessage } from "./hydrationMessages";

describe("HYDRATION_MESSAGES", () => {
  it("has more than one message so the card can actually vary", () => {
    expect(HYDRATION_MESSAGES.length).toBeGreaterThan(1);
  });

  it("every message has non-empty quote and sub text", () => {
    for (const message of HYDRATION_MESSAGES) {
      expect(message.quote.length).toBeGreaterThan(0);
      expect(message.sub.length).toBeGreaterThan(0);
    }
  });
});

describe("getRandomHydrationMessage", () => {
  it("always returns one of the known messages", () => {
    for (let i = 0; i < 20; i++) {
      expect(HYDRATION_MESSAGES).toContainEqual(getRandomHydrationMessage());
    }
  });
});
