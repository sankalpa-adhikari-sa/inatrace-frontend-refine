import { type AuthProvider, keys } from "@refinedev/core";
import type { ApiUserGet } from "@/client/types.gen";
import { setLoggedOut } from "@/lib/api";
import { changeLocale } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { useCompanyStore } from "@/stores/company";
import { call } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { safeRedirect } from "@/lib/safe-redirect";

export type Identity = ApiUserGet;
export type Role = NonNullable<ApiUserGet["role"]>;

let profile: Promise<ApiUserGet | null> | null = null;

/** Current user's profile, fetched once and cached until invalidated. */
export function getProfile(): Promise<ApiUserGet | null> {
  if (!profile) {
    profile = call(ep.getProfileForUser)
      .then((user) => user ?? null)
      .catch(() => null);
  }
  return profile;
}

export function invalidateProfile() {
  profile = null;
}

/** `/login?to=<current page>`, so logging in again returns here (none when already on /login). */
function loginReturningHere(): string {
  const { pathname, search, hash } = window.location;
  if (pathname === "/login") return `/login${search}`;
  return `/login?to=${encodeURIComponent(pathname + search + hash)}`;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password, redirectTo }) => {
    try {
      await call(ep.login, { body: { username: email, password } });
      setLoggedOut(false);
      invalidateProfile();
      const user = await getProfile();
      if (!user) throw new Error("Could not load user profile");
      // Drop data cached for whoever used this tab before (logout keeps it in memory, since
      // removing it while the app is still mounted would refetch without a session).
      queryClient.removeQueries({ queryKey: keys().data().get() });
      const target = safeRedirect(redirectTo);
      // Logging in switches to the user's language.
      if (user.language) await changeLocale(user.language);
      return { success: true, redirectTo: target };
    } catch (error) {
      // The API client already toasts "Wrong username or password".
      return { success: false, error: error as Error };
    }
  },

  logout: async () => {
    setLoggedOut(true);
    sessionStorage.clear();
    try {
      await call(ep.logout);
    } catch {
      // Session may already be gone; still clear local state.
    }
    invalidateProfile();
    useCompanyStore.getState().clear();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const user = await getProfile();
    return user
      ? { authenticated: true }
      : { authenticated: false, logout: true, redirectTo: "/login" };
  },

  onError: async (error) => {
    if (error?.statusCode === 401) {
      invalidateProfile();
      // Refine's useOnError passes this to logout, ahead of the /login that logout() returns.
      return { logout: true, redirectTo: loginReturningHere() };
    }
    return {};
  },

  getIdentity: () => getProfile(),

  getPermissions: async () => (await getProfile())?.role ?? null,

  register: async ({ name, surname, email, password }) => {
    try {
      await call(ep.createUser, { body: { name, surname, email, password } });
      return { success: true, redirectTo: "/account-activation" };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  forgotPassword: async ({ email }) => {
    try {
      await call(ep.requestResetPassword, { body: { email } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  updatePassword: async ({ token, password }) => {
    try {
      await call(ep.resetPassword, { body: { token, password } });
      return { success: true, redirectTo: "/home" };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },
};

export function isAdmin(user?: ApiUserGet | null) {
  return user?.role === "SYSTEM_ADMIN" || user?.role === "REGIONAL_ADMIN";
}

export function isSystemAdmin(user?: ApiUserGet | null) {
  return user?.role === "SYSTEM_ADMIN";
}

export function isCompanyAdmin(user: ApiUserGet | null | undefined, companyId?: number) {
  return companyId != null && !!user?.companyIdsAdmin?.includes(companyId);
}

export function canManageCompany(user: ApiUserGet | null | undefined, companyId?: number) {
  if (!user || companyId == null) return false;
  if (user.role === "SYSTEM_ADMIN") return true;
  if (user.role === "REGIONAL_ADMIN" && user.companyIds?.includes(companyId)) return true;
  return isCompanyAdmin(user, companyId);
}
