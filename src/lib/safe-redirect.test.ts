import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it.each([
    undefined,
    null,
    "",
    "home",
    "https://evil.test/x",
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
    " /home",
  ])("rejects %j", (input) => {
    expect(safeRedirect(input)).toBe("/home");
  });

  it.each([
    ["/my-stock/payments", "/my-stock/payments"],
    ["/my-customers?currentPage=2#top", "/my-customers?currentPage=2#top"],
    ["/a/../b", "/b"],
  ])("keeps the in-app path %j", (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it("uses the given fallback", () => {
    expect(safeRedirect("//evil.test", "/login")).toBe("/login");
  });
});
