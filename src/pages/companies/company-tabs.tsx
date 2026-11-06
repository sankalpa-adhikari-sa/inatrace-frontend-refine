import type { ReactNode } from "react";
import { PageHeader, PageTabs } from "@/components/app/page";
import { useIdentity } from "@/hooks/use-session";
import { isAdmin, isCompanyAdmin } from "@/providers/auth";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";

/**
 * Header + tabs shared by the company screens (port of
 * CompanyDetailTabManagerComponent). Facilities and processing actions are
 * locked unless the user is admin of that company; everything but the
 * profile is locked while creating a company.
 */
export function CompanyTabs({
  companyId,
  title,
  actions,
}: {
  companyId?: number;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const translate = useTranslate();
  const { user } = useIdentity();
  const isNew = companyId == null;
  const companyAdmin = isCompanyAdmin(user, companyId);
  const { data: name } = useApi(
    ep.getCompanyName,
    { path: { id: companyId ?? 0 } },
    { enabled: !isNew, select: (r) => r?.name }
  );

  const base = `/companies/${companyId}`;
  const onlyCompanyAdmins = translate("companies.texts.onlyAdminsOfThisCompany");
  return (
    <>
      <PageHeader
        title={
          title ??
          (isNew
            ? translate("companies.titles.newCompany")
            : name ?? translate("companies.titles.company"))
        }
        back={isAdmin(user) ? "/companies" : undefined}
        actions={actions}
      />
      <PageTabs
        tabs={[
          {
            label: translate("common.fields.company"),
            to: isNew ? "/companies/new" : `${base}/company`,
          },
          { label: translate("companies.fields.users"), to: `${base}/users`, disabled: isNew },
          {
            label: translate("companies.fields.facilities"),
            to: `${base}/facilities`,
            disabled: isNew || !companyAdmin,
            disabledReason: isNew ? undefined : onlyCompanyAdmins,
            onboarding: "tab-facilities",
          },
          {
            label: translate("companies.fields.processingActions"),
            to: `${base}/processingActions`,
            disabled: isNew || !companyAdmin,
            disabledReason: isNew ? undefined : onlyCompanyAdmins,
            onboarding: "tab-processing-actions",
          },
        ]}
      />
    </>
  );
}
