import { useTranslate } from "@refinedev/core";
import type { ApiCompanyUser, ApiUserGet } from "@/client/types.gen";

export type CompanyRole = NonNullable<ApiCompanyUser["companyRole"]>;
export type SystemRole = NonNullable<ApiUserGet["role"]>;

export const COMPANY_ROLE_ORDER: CompanyRole[] = ["COMPANY_ADMIN", "COMPANY_USER", "MANAGER", "ACCOUNTANT"];

/** Translated names of company roles (companyUserRole.roles.*) and system roles. */
export function useRoleLabels() {
  const translate = useTranslate();
  const company: Record<CompanyRole, string> = {
    COMPANY_ADMIN: translate("common.texts.companyAdmin"),
    COMPANY_USER: translate("common.texts.companyUser"),
    MANAGER: translate("common.texts.manager"),
    ACCOUNTANT: translate("common.texts.accountant"),
  };
  const system: Record<SystemRole, string> = {
    SYSTEM_ADMIN: translate("common.texts.systemAdmin"),
    REGIONAL_ADMIN: translate("common.texts.regionalAdmin"),
    USER: translate("common.texts.user"),
  };
  return { company, system };
}
