import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { tr } from "../../test/tr";
import { notifyApiError, SESSION_EXPIRED_EVENT, setLoggedOut } from "./api";

const URL_BASE = "http://localhost:3000";

describe("notifyApiError", () => {
  const add = () => vi.spyOn(toast, "add");
  const sessionExpired = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, sessionExpired);
  afterEach(() => sessionExpired.mockClear());

  it("shows 'wrong username or password' for a failed login, without expiring the session", () => {
    const spy = add();
    notifyApiError(401, `${URL_BASE}/api/user/login`, null);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", description: tr("notifications.wrongUsernameOrPassword") }),
    );
    expect(sessionExpired).not.toHaveBeenCalled();
  });

  it.each(["/api/user/profile", "/api/user/logout"])("stays quiet on an expected 401 from %s", (path) => {
    const spy = add();
    notifyApiError(401, `${URL_BASE}${path}`, null);
    expect(spy).not.toHaveBeenCalled();
    expect(sessionExpired).not.toHaveBeenCalled();
  });

  it("expires the session on any other 401", () => {
    const spy = add();
    notifyApiError(401, `${URL_BASE}/api/company/1?x=1`, null);
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stays quiet on 401s right after a deliberate logout", () => {
    const spy = add();
    setLoggedOut(true);
    notifyApiError(401, `${URL_BASE}/api/company/1`, null);
    expect(spy).not.toHaveBeenCalled();
    expect(sessionExpired).not.toHaveBeenCalled();
  });

  it("toasts once for a server error", () => {
    const spy = add();
    notifyApiError(500, `${URL_BASE}/api/company/1`, { status: "ERROR", errorMessage: "GENERIC_ERROR" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });
});
