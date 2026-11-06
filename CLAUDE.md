# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The INATrace web frontend: Refine v5 used headless, React 19, React Router v7, the Base UI flavour of
shadcn/ui (`components.json`, style `base-mira`) and Tailwind v4. It replaced an Angular frontend; deliberate
differences from it are listed under "Behaviour changes from Angular" in `README.MD`. The Spring backend lives
in `../inatrace-backend`. Keep the README's "Behaviour changes from Angular" section up to date when you
change behaviour.

## Commands

```bash
bun install
bun run dev            # refine dev → Vite on :5173, proxies /api to $API_PROXY_TARGET (default http://localhost:8080)
bun run build          # i18n:check + tsc typecheck (src, test, e2e) + refine build
bun run i18n:check     # translation keys used in src/ vs public/locales/*/common.json (--verbose for gaps)
bunx tsc               # typecheck only
bun run openapi-ts     # regenerate src/client/types.gen.ts by hand
OPENAPI_INPUT=http://localhost:8080/v3/api-docs bun run openapi-ts   # from the live backend
bun run test:run       # Vitest once (bun run test = watch, test:cov = coverage)
bun run e2e:stack      # Playwright end-to-end against a disposable seeded backend (Docker, published backend image)
bun run e2e            # the same suite against a running backend (needs E2E_* accounts, see README "Testing")
bun run test:ui        # Playwright UI tests, API mocked, no backend
```

Tests: Vitest files sit next to the code (`src/**/*.test.ts(x)`). `e2e/` is end-to-end against the real backend
(no mocking); `test/ui/` is Playwright with the API mocked; page objects shared by both are in `test/pages/`.
Mocks use `on(ep.x, …)` handlers keyed on `src/lib/endpoints.ts` and fail on any request nobody mocked; find
elements with `tr(key)` / `trLabel(key)` from `test/tr.ts`, not hard-coded English. See "Testing" in `README.MD`.
Verify changes with `bun run build`, `bun run test:run`, `bun run test:ui`, and `bun run e2e:stack`.

ESLint currently can't run: `typescript-eslint` 8 refuses TypeScript 7 (`typescript@^7` in package.json).

Env vars: only `VITE_*` reach the app (read through `src/lib/env.ts`); see `.env.example` for all of them.
`API_PROXY_TARGET` and `OPENAPI_INPUT` are read from the shell, not `.env` files. Defaults for `dev` / `build`
are in `.env.development` / `.env.production`.

## API layer (read before touching data fetching)

- **Types only are generated.** `@hey-api/openapi-ts` (plugin `@hey-api/typescript`) writes
  `src/client/types.gen.ts` from `openapi/inatrace-api.json` (a checked-in copy of the backend's `/v3/api-docs`).
  The Vite plugin regenerates it on every dev start and build. Don't hand-edit it; update the spec instead.
- **`src/lib/endpoints.ts`** (`ep`): every backend operation as `endpoint<T.XxxData, T.XxxResponse>(method, url)`.
  The URL literal must match the spec, so a renamed/removed backend endpoint becomes a type error. Add new
  operations here (kept alphabetical).
- **`src/providers/resources.ts`**: maps Refine resource names (`companies`, `facilities`, `user-customers`, …)
  to `ep` entries for list/one/create/update/remove. Scoping params come through `meta`
  (e.g. `meta.companyId`, `meta.scope: "all" | "mine" | "regional"`, `meta.type: "FARMER" | "COLLECTOR"`).
- **`src/providers/data.ts`**: one `@refinedev/rest` data provider (ky) for everything.
  - Unwraps the backend's `{ status, data }` envelope; list responses are `{ items, count }`.
  - Pagination/sort become `limit`/`offset`/`sortBy`/`sort=ASC|DESC`; filters become plain query params;
    arrays are sent comma-separated (`toSearchParams` in `src/lib/endpoint.ts`).
  - Most InaTrace "create" endpoints are create-or-update `PUT`s; `create` is routed through `update` when the
    endpoint's method isn't `post`.
  - Cookie session (`credentials: "include"`), `language` header from the current locale, and error toasts
    for every non-OK response are ky hooks here; don't add per-call error toasts for HTTP failures.
- **`src/lib/http.ts`**: non-CRUD calls go through the provider's `custom` method:
  `call(ep.x, { path, query, body })` (imperative), `useApi(ep.x, args, { enabled, select, keepPrevious })`
  (query hook over `useCustom`), `callRaw` (un-enveloped JSON), `download` (blob → file), `uploadFile` /
  `postFile` (multipart via the provider's `kyInstance`, since `custom` always sends JSON).

Use Refine hooks (`useTable`, `useForm`, `useOne`, `useList`) when a resource exists in `resources.ts`;
otherwise `call`/`useApi`. Don't introduce another HTTP client.

Writes made with `call` go through `useApiMutation` (a `useMutation` that invalidates every Refine data
query on success), or call `useInvalidateData()` after an imperative `call`. Don't just refetch the current
table: other screens show the same data (payments ↔ deliveries ↔ stock).

## App structure

- **Routing** is all in `src/App.tsx` (React Router v7 with Refine's router provider). Route groups: guest
  (login/register), public (landing, `/s/*` policies, public blog), B2C product page `/p-cd/:uuid/:qrTag/*`
  with nested tabs, QR redirects (`/q/…`, `/q-cd/…`), and the authenticated `AppLayout`. Legacy Angular URLs
  are kept working with redirect components (`DropLastSegment`, `LegacyStockTab`, `LocalePrefixRedirect`).
  Pages are code-split: register a new page with `lazyPage(() => import("./pages/…"), "ExportName")`
  (`src/lib/lazy-page.ts`), not a static import, so public pages don't pull in the admin app.
- **Auth & permissions**: `src/providers/auth.ts` (cookie session; `isAdmin`, `isSystemAdmin`,
  `isCompanyAdmin`, `canManageCompany`) and route guards in `src/components/app/guards.tsx`
  (`RequireActive`, `RequireAdmin`, `RequireCompanyManager`, `RequireCompanyAdmin`). Company roles: `COMPANY_ADMIN`, `COMPANY_USER`, `MANAGER`, `ACCOUNTANT` (`src/hooks/use-roles.ts`).
- **Selected company**: most operational pages work "as" one company. `src/stores/company.ts` (zustand,
  persisted under the localStorage key `selectedUserCompany`, kept from the Angular app), read with
  `useSelectedCompany()` from `src/hooks/use-session.ts`. `CompanyGate` in the authenticated layout blocks the
  app until one is selected.
- **Self-onboarding** state (checklist flows, "My stock" tour) is in `src/stores/onboarding.ts`; call
  `completeOnboarding(flow)` after a successful save; UI in `src/components/app/onboarding/`.
- **Pages** in `src/pages/<area>/`. Larger forms are split into folders with a `model` file (form types,
  defaults, API ↔ form mapping) plus section components, re-exported from `index.ts`
  (e.g. `stock/processing-order/`, `user-customers/form/`, `products/product-page/`, `public/b2c/`).
- **Components**: `src/components/ui/` is shadcn-generated (add via the shadcn CLI rather than hand-writing);
  `src/components/refine-ui/` is Refine's shadcn layer; `src/components/app/` holds the app's shared pieces:
  page chrome (`PageHeader`, route-driven `PageTabs`, `Section`, `FormActions` in `page.tsx`), react-hook-form
  field wrappers (`form-fields.tsx`: `TextField`, `SelectField`, `EntitySelectField`, `EntityListField`, …),
  `UploadField`, `SearchSelectField`, maps (MapLibre, `map-view.tsx`, lazy-loaded impl). Reuse these before
  writing new form/field markup.
- Path alias `@/` → `src/`.

## i18n

Refine `i18nProvider` over i18next (`src/providers/i18n.ts`, `src/lib/i18n.ts`). In components use
`useTranslate()`; outside components use `t()` from `@/lib/i18n`.

- Locale files: `public/locales/<lng>/common.json` (en/de/rw/es), nested JSON. `en` is the source of truth
  and the fallback; add every new key to `en/common.json` (and to de/rw/es when you have the translation).
  Call sites pass no English default: `translate("stock.fields.quantity")`.
- Keys are `<area>.<kind>.<name>`: area = page folder in camelCase (`stock`, `stock.payments`, `userCustomers`,
  `products.productPage`, `b2c`) or `common` for shared components; kind = `fields` | `titles` | `buttons` |
  `errors` | `placeholders` | `descriptions` | `notifications` | `texts`; name = camelCased English text.
  Text shared across areas goes under `common.*`, or Refine's top-level `buttons.*` / `notifications.*`.
  Refine-ui's own keys (`buttons.create`, `table.filter.*`, `pages.error.*`) are kept as Refine names them.
- Backend enum values (statuses, roles, gender, …) are shown with `humanize(value)` from
  `components/app/controls.tsx`, which looks up `enums.<VALUE>` and falls back to the readable value. Add new
  enum values to `enums` in every locale file rather than translating them at the call site.
- Never put user-visible English in a component as a plain string (labels, column headers, validation
  messages, `aria-label`s, option lists); every such string goes through `translate()` / `t()`.
- Placeholders are i18next's: `"Farmers from {{producer}}"` → `translate("b2c.texts.farmersFrom", { producer })`.
- Text defined at module level (option lists, column defs) must be read at render: use a getter
  (`get label() { return t("…"); }`) or, for TanStack column headers, `header: () => t("…")`. A plain
  `label: t("…")` is evaluated once and won't follow a language change.
- `bun run i18n:check` (run by `bun run build`) fails when a key used in `src/` is missing from `en/common.json`.
- Language is stored in localStorage (`inatraceLocale`, not the URL) and switches live via
  `i18n.changeLanguage` (`changeLocale` in `@/lib/i18n`); there's no reload.

## Local dev login

The local backend usually runs on :8080. After login a "Select company" dialog appears: picking a company only
highlights it; you must click **Select** to set the company context.
