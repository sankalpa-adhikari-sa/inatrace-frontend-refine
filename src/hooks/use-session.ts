import { useGetIdentity, useInvalidate, useInvalidateAuthStore, useOne } from "@refinedev/core";
import { useCallback } from "react";
import type { ApiCompanyGet } from "@/client/types.gen";
import { type Identity, invalidateProfile } from "@/providers/auth";
import { useCompanyStore } from "@/stores/company";

export function useIdentity() {
  const { data, isLoading } = useGetIdentity<Identity>();
  return { user: data ?? null, isLoading };
}

/** Re-fetch the cached profile, e.g. after the user edits it. */
export function useRefreshIdentity() {
  const invalidateAuthStore = useInvalidateAuthStore();
  return useCallback(async () => {
    invalidateProfile();
    await invalidateAuthStore();
  }, [invalidateAuthStore]);
}

/** The company the user is currently working as (persisted in localStorage). */
export function useSelectedCompany() {
  const companyId = useCompanyStore((s) => s.selectedCompanyId);
  const { result, query } = useOne<ApiCompanyGet>({
    resource: "companies",
    id: companyId ?? undefined,
    queryOptions: { enabled: companyId != null },
  });
  return { companyId, company: companyId != null ? result : undefined, isLoading: companyId != null && query.isLoading };
}

export function useInvalidateSelectedCompany() {
  const invalidate = useInvalidate();
  const companyId = useCompanyStore((s) => s.selectedCompanyId);
  return useCallback(
    () => invalidate({ resource: "companies", invalidates: ["detail"], id: companyId ?? undefined }),
    [invalidate, companyId],
  );
}
