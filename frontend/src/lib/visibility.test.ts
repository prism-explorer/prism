import { describe, expect, it } from "vitest";
import { shouldRefresh } from "./visibility";

describe("shouldRefresh", () => {
  it("refreshes a visible tab", () => {
    expect(shouldRefresh("visible")).toBe(true);
  });

  it("makes no refresh call for a hidden tab", () => {
    expect(shouldRefresh("hidden")).toBe(false);
  });
});
