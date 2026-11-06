import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ApiUserGet } from "@/client/types.gen";
import { ConfirmProvider } from "@/components/app/confirm";
import { Toaster } from "@/components/ui/toast";
import { ep } from "@/lib/endpoints";
import { queryClient } from "@/lib/query-client";
import { authProvider } from "@/providers/auth";
import { dataProvider } from "@/providers/data";
import { useI18nProvider } from "@/providers/i18n";
import { notificationProvider } from "@/providers/notification";
import { useCompanyStore } from "@/stores/company";
import { profiles } from "./factories";
import { ok, on, server } from "./msw";

type Options = {
  /** Initial URL. */
  route?: string;
  /** Route pattern the element is mounted at (so `useParams` works). */
  path?: string;
  /** Logged-in user; `null` = logged out. */
  profile?: ApiUserGet | null;
  /** Selected company (`selectedUserCompany`); `null` = none. */
  companyId?: number | null;
};

function Providers({ children }: { children: ReactNode }) {
  const i18nProvider = useI18nProvider();
  return (
    <Refine
      authProvider={authProvider}
      dataProvider={dataProvider}
      notificationProvider={notificationProvider}
      i18nProvider={i18nProvider}
      routerProvider={routerProvider}
      options={{ disableTelemetry: true, reactQuery: { clientConfig: queryClient } }}
    >
      <ConfirmProvider>{children}</ConfirmProvider>
    </Refine>
  );
}

/**
 * Renders `ui` inside the app's real providers (Refine with the real data / auth / notification / i18n
 * providers, router, confirm dialog, toaster), with the profile and selected company mocked through MSW.
 * Any other route renders `data-testid="elsewhere"`, for asserting navigation.
 */
export function renderWithRefine(ui: ReactElement, options: Options = {}) {
  const { route = "/", path = "*", profile = profiles.companyAdmin({ companyId: 1 }), companyId = 1 } = options;

  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  server.use(
    on(ep.getProfileForUser, () => (profile ? ok(profile) : new Response(null, { status: 401 }))),
  );
  if (companyId != null) {
    useCompanyStore.getState().select(companyId);
    server.use(on(ep.getCompany, ({ params }) => ok({ id: Number(params.id), name: "Test Co-op" })));
  }

  const user = userEvent.setup();
  const result = render(
    <Toaster>
      <MemoryRouter initialEntries={[route]}>
        <Providers>
          <Routes>
            <Route path={path} element={ui} />
            {path !== "*" && <Route path="*" element={<div data-testid="elsewhere" />} />}
          </Routes>
        </Providers>
      </MemoryRouter>
    </Toaster>,
  );
  return { user, ...result };
}
