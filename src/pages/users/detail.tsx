import { useInvalidate, useMany, useNotification, useOne, useTranslate, useSetLocale } from "@refinedev/core";
import { Building2, Check, ChevronRight, MapPin, UserCog } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiCompanyGet, ApiUserGet } from "@/client/types.gen";
import { CompanyAvatar } from "@/components/app/company-avatar";
import { useConfirm } from "@/components/app/confirm";
import { humanize } from "@/components/app/controls";
import { SelectField, TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useGoBack } from "@/hooks/use-go-back";
import { useRoleLabels } from "@/hooks/use-roles";
import { useIdentity, useRefreshIdentity } from "@/hooks/use-session";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { focusFirstError } from "@/lib/form-errors";
import { useCompanyStore } from "@/stores/company";
import { call, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Language = NonNullable<ApiUserGet["language"]>;

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "EN", get label() { return t("users.fields.english"); } },
  { value: "DE", get label() { return t("users.fields.deutsch"); } },
  { value: "RW", get label() { return t("users.fields.kinyarwanda"); } },
  { value: "ES", get label() { return t("users.fields.espaOl"); } },
];

type FormValues = { name: string; surname: string; email: string; language: Language | null };

/**
 * `/user-profile` edits the logged-in user; `/users/:id` is the admin view.
 */
export function UserDetail() {
  const { id } = useParams();
  const adminView = id != null;
  const { user: me, isLoading: meLoading } = useIdentity();
  const { result: adminUser, query: adminQuery } = useOne<ApiUserGet>({
    resource: "users",
    id,
    queryOptions: { enabled: adminView },
  });

  const user = adminView ? adminUser : me;
  if (adminView ? adminQuery.isLoading : meLoading) return <PageLoader />;
  if (!user) return null;

  return <UserForm key={user.id} user={user} adminView={adminView} />;
}

function UserForm({ user, adminView }: { user: ApiUserGet; adminView: boolean }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const historyBack = useGoBack("/home");
  const changedCompany = useRef(false);
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const refreshIdentity = useRefreshIdentity();
  const { open: notify } = useNotification();
  const { selectedCompanyId, select } = useCompanyStore();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: user.name ?? "",
      surname: user.surname ?? "",
      email: user.email ?? "",
      language: user.language ?? "EN",
    },
  });

  // Warns on in-app navigation too, not only when closing the tab.
  const release = useWarnWhenDirty(control);

  // After saving: the admin view returns to the users list; your own profile to the page you came from.
  // `then` runs after the navigation has landed.
  const goBack = (then?: () => void) => {
    if (adminView) navigate("/users");
    else if (changedCompany.current) navigate("/home");
    else return historyBack(then);
    then?.();
  };

  const setLocale = useSetLocale();
  const save = useApiMutation({
    mutationFn: async (v: FormValues) => {
      const body = { name: v.name, surname: v.surname, language: v.language ?? undefined };
      if (adminView) await call(ep.adminUpdateProfile, { body: { ...body, id: user.id } });
      else await call(ep.updateProfile, { body });
    },
    onSuccess: async (_, v) => {
      reset(v);
      release();
      if (adminView) {
        await invalidate({ resource: "users", invalidates: ["detail", "list"], id: user.id });
      } else {
        await refreshIdentity();
      }
      notify?.({ type: "success", message: translate("users.notifications.profileSaved") });
      const language = !adminView ? v.language : null;
      goBack(language ? () => setLocale(language) : undefined);
    },
  });

  const confirmEmail = useApiMutation({
    mutationFn: () => call(ep.activateUser, { path: { action: "CONFIRM_USER_EMAIL" }, body: { id: user.id } }),
    onSuccess: () => invalidate({ resource: "users", invalidates: ["detail", "list"], id: user.id }),
    onError: () =>
      notify?.({
        type: "error",
        message: translate("users.notifications.error"),
        description: translate("users.notifications.cannotConfirmUserEmail"),
      }),
  });

  const resetPassword = useApiMutation({
    mutationFn: () => call(ep.requestResetPassword, { body: { email: user.email ?? "" } }),
    onSuccess: () => notify?.({ type: "success", message: translate("users.notifications.passwordResetLinkSent") }),
  });

  const companyIds = user.companyIds ?? [];
  const { result: companiesResult, query: companiesQuery } = useMany<ApiCompanyGet>({
    resource: "companies",
    ids: companyIds,
    queryOptions: { enabled: companyIds.length > 0 },
  });
  const companyName = (cid: number) => companiesResult.data?.find((c) => c.id === cid)?.name;

  async function switchCompany(companyId: number, name?: string) {
    if (adminView || companyId === selectedCompanyId) return;
    const ok = await confirm({
      description: translate("users.descriptions.areYouSureYouWant", { name }),
    });
    if (ok) {
      select(companyId);
      changedCompany.current = true;
    }
  }

  return (
    <>
      <PageHeader
        title={
          adminView
            ? translate("users.titles.editUserProfile")
            : translate("users.titles.editMyProfile")
        }
        back={!adminView}
        breadcrumbs={adminView ? [{ label: translate("common.fields.users"), to: "/users" }] : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{humanize(user.role)}</Badge>
            <Badge variant="secondary">{humanize(user.status)}</Badge>
          </div>
        }
      />
      <form onSubmit={handleSubmit((v) => save.mutate(v), focusFirstError)} className="flex flex-col gap-6">
        {/* Below lg the grid dissolves (`contents`) so the companies section can move after the actions. */}
        <div className="contents lg:grid lg:grid-cols-3 lg:gap-6">
          <Section
            title={translate("common.titles.basicInformation")}
            className="lg:col-span-2"
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="name"
                label={translate("common.fields.firstName")}
                rules={{ required: translate("common.errors.firstNameIsRequired") }}
              />
              <TextField
                control={control}
                name="surname"
                label={translate("common.fields.lastName")}
                rules={{ required: translate("common.errors.lastNameIsRequired") }}
              />
              <TextField
                control={control}
                name="email"
                label={translate("users.fields.username")}
                disabled
                className="sm:col-span-2"
              />
              <SelectField
                control={control}
                name="language"
                label={translate("users.fields.language")}
                options={LANGUAGES}
              />
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={resetPassword.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    description: translate("users.descriptions.areYouSureYouWantToSendPassword", { email: user.email }),
                  });
                  if (ok) resetPassword.mutate();
                }}
              >
                {translate("users.buttons.resetPassword")}
              </Button>
              {adminView && user.status === "UNCONFIRMED" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={confirmEmail.isPending}
                  onClick={() => confirmEmail.mutate()}
                >
                  {translate("users.buttons.confirmUserEmail")}
                </Button>
              )}
            </div>
          </Section>

          <Section
            className="order-last lg:order-none"
            title={
              adminView
                ? translate("users.titles.userCompanies")
                : translate("users.titles.myCompanies")
            }
            description={
              !adminView && companyIds.length > 1 ? translate("users.descriptions.selectACompanyToWork") : undefined
            }
          >
            {companyIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {translate("users.texts.noCompanies")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {companyIds.map((cid) => (
                  <li key={cid}>
                    <CompanyCard
                      company={companiesResult.data?.find((c) => c.id === cid)}
                      loading={companiesQuery.isLoading}
                      userId={user.id}
                      current={!adminView && cid === selectedCompanyId}
                      onOpen={() =>
                        adminView ? navigate(`/companies/${cid}`) : switchCompany(cid, companyName(cid))
                      }
                      action={adminView ? translate("users.texts.viewCompany") : translate("users.texts.switch")}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <FormActions>
          <Button type="button" variant="outline" onClick={() => goBack()}>
            {translate("users.buttons.back")}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

/**
 * One of the user's companies: logo, name, the user's role there, headquarters, value chains
 * and company types. Clicking switches to it (own profile) or opens it (admin view).
 */
function CompanyCard({
  company,
  loading,
  userId,
  current,
  onOpen,
  action,
}: {
  company?: ApiCompanyGet;
  loading: boolean;
  userId?: number;
  current: boolean;
  onOpen: () => void;
  action: string;
}) {
  const translate = useTranslate();
  const roles = useRoleLabels();
  if (!company) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3 text-xs text-muted-foreground">
        {loading ? <Spinner /> : <Building2 className="size-4" />}
      </div>
    );
  }
  const role = company.users?.find((u) => u.id === userId)?.companyRole;
  const hq = company.headquarters;
  const place = [hq?.city || hq?.village || hq?.hondurasMunicipality, hq?.country?.name].filter(Boolean).join(", ");
  const chips = [
    ...(company.valueChains ?? []).map((v) => v.name).filter(Boolean),
    ...(company.companyRoles ?? []).map((r) => humanize(r)),
  ] as string[];
  const MAX_CHIPS = 4;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={current}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        current ? "cursor-default border-primary bg-primary-lighter" : "hover:border-primary/60 hover:bg-accent"
      )}
    >
      <CompanyAvatar company={company} className="size-11" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{company.name}</span>
          {current && (
            <Badge className="shrink-0">
              <Check />
              {translate("users.texts.current")}
            </Badge>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {role && (
            <span className="flex items-center gap-1">
              <UserCog className="size-3.5" />
              {roles.company[role]}
            </span>
          )}
          {place && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {place}
            </span>
          )}
        </span>
        {chips.length > 0 && (
          <span className="flex flex-wrap gap-1 pt-0.5">
            {chips.slice(0, MAX_CHIPS).map((c) => (
              <Badge key={c} variant="outline" className="font-normal">
                {c}
              </Badge>
            ))}
            {chips.length > MAX_CHIPS && (
              <Badge variant="outline" className="font-normal" title={chips.slice(MAX_CHIPS).join(", ")}>
                +{chips.length - MAX_CHIPS}
              </Badge>
            )}
          </span>
        )}
      </span>
      {!current && (
        <span className="hidden shrink-0 items-center gap-1 self-center text-xs text-muted-foreground group-hover:text-foreground sm:flex">
          {action}
          <ChevronRight className="size-4" />
        </span>
      )}
    </button>
  );
}
