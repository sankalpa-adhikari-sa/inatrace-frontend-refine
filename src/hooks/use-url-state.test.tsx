import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { BrowserRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { useUrlFilters } from "./use-url-state";

const wrapper = ({ children }: { children: ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe("useUrlFilters", () => {
  it("keeps both of two updates made in the same tick, and other query parameters", () => {
    window.history.replaceState(null, "", "/list?facilityId=3");
    const { result } = renderHook(() => ({ url: useUrlFilters(["from", "to"] as const), location: useLocation() }), {
      wrapper,
    });

    act(() => {
      result.current.url.set({ from: "2026-01-01" });
      result.current.url.set({ to: "2026-02-01" });
    });

    expect(result.current.url.values).toEqual({ from: "2026-01-01", to: "2026-02-01" });
    expect(result.current.url.active).toBe(true);
    expect(new URLSearchParams(result.current.location.search).get("facilityId")).toBe("3");

    act(() => result.current.url.clear());
    expect(result.current.url.values).toEqual({ from: "", to: "" });
    expect(result.current.url.active).toBe(false);
    expect(result.current.location.search).toBe("?facilityId=3");
  });
});
