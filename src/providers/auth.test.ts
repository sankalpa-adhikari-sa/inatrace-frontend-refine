import { describe, expect, it, vi } from "vitest";
import { ep } from "@/lib/endpoints";
import { getLocale } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { useCompanyStore } from "@/stores/company";
import { profiles } from "../../test/factories";
import { fail, ok, on, requestsTo, server } from "../../test/msw";
import { authProvider, canManageCompany, getProfile, invalidateProfile, isAdmin, isCompanyAdmin } from "./auth";

describe("authProvider", () => {
  it("login: drops cached data, switches to the user's language and redirects safely", async () => {
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    server.use(
      on(ep.login, () => ({ status: "OK" }) as never),
      on(ep.getProfileForUser, () => ok(profiles.companyAdmin({ language: "DE" }))),
    );

    const result = await authProvider.login({ email: "a@b.test", password: "x", redirectTo: "//evil.test" });

    expect(result).toEqual({ success: true, redirectTo: "/home" });
    expect(requestsTo(ep.login)[0].body).toEqual({ username: "a@b.test", password: "x" });
    expect(removeQueries).toHaveBeenCalled();
    expect(getLocale()).toBe("de");
  });

  it("login: keeps an in-app redirect target", async () => {
    server.use(
      on(ep.login, () => ({ status: "OK" }) as never),
      on(ep.getProfileForUser, () => ok(profiles.companyUser())),
    );
    expect(await authProvider.login({ email: "a@b.test", password: "x", redirectTo: "/my-stock/payments" })).toEqual({
      success: true,
      redirectTo: "/my-stock/payments",
    });
  });

  it("login: a wrong password returns success: false", async () => {
    server.use(on(ep.login, () => fail(401)));
    expect(await authProvider.login({ email: "a@b.test", password: "bad" })).toMatchObject({ success: false });
  });

  it("caches the profile until it's invalidated", async () => {
    server.use(on(ep.getProfileForUser, () => ok(profiles.companyUser())));
    await Promise.all([getProfile(), getProfile()]);
    expect(requestsTo(ep.getProfileForUser)).toHaveLength(1);
    invalidateProfile();
    await getProfile();
    expect(requestsTo(ep.getProfileForUser)).toHaveLength(2);
  });

  it("check: unauthenticated without a profile", async () => {
    server.use(on(ep.getProfileForUser, () => new Response(null, { status: 401 })));
    expect(await authProvider.check()).toEqual({ authenticated: false, logout: true, redirectTo: "/login" });
  });

  it("onError: a 401 logs out and returns to the current page after login", async () => {
    window.history.replaceState(null, "", "/my-stock/payments?tab=1#x");
    expect(await authProvider.onError({ statusCode: 401 })).toEqual({
      logout: true,
      redirectTo: `/login?to=${encodeURIComponent("/my-stock/payments?tab=1#x")}`,
    });
    expect(await authProvider.onError({ statusCode: 500 })).toEqual({});
  });

  it("logout clears local state even when the backend call fails", async () => {
    useCompanyStore.getState().select(4);
    sessionStorage.setItem("something", "1");
    server.use(on(ep.logout, () => fail(500)));

    expect(await authProvider.logout({})).toEqual({ success: true, redirectTo: "/login" });
    expect(useCompanyStore.getState().selectedCompanyId).toBeNull();
    expect(localStorage.getItem("selectedUserCompany")).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});

describe("role predicates", () => {
  it.each([
    ["system admin", profiles.systemAdmin(), true],
    ["regional admin", profiles.regionalAdmin(), true],
    ["company admin", profiles.companyAdmin(), false],
    ["no user", null, false],
  ])("isAdmin(%s) → %s", (_, user, expected) => {
    expect(isAdmin(user)).toBe(expected);
  });

  it.each([
    ["system admin, any company", profiles.systemAdmin(), 9, true],
    ["regional admin, own company", profiles.regionalAdmin({ companyIds: [9] }), 9, true],
    ["regional admin, other company", profiles.regionalAdmin({ companyIds: [2] }), 9, false],
    ["company admin of it", profiles.companyAdmin({ companyId: 9 }), 9, true],
    ["company admin of another", profiles.companyAdmin({ companyId: 2 }), 9, false],
    ["company user of it", profiles.companyUser({ companyId: 9 }), 9, false],
    ["no company id", profiles.systemAdmin(), undefined, false],
    ["no user", null, 9, false],
  ])("canManageCompany: %s → %s", (_, user, companyId, expected) => {
    expect(canManageCompany(user, companyId)).toBe(expected);
  });

  it("isCompanyAdmin only counts companyIdsAdmin", () => {
    expect(isCompanyAdmin(profiles.companyAdmin({ companyId: 3 }), 3)).toBe(true);
    expect(isCompanyAdmin(profiles.companyUser({ companyId: 3 }), 3)).toBe(false);
    expect(isCompanyAdmin(profiles.systemAdmin(), 3)).toBe(false);
  });
});
