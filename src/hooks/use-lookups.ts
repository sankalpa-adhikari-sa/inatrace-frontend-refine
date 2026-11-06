import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

// Reference data used by many forms. Cached for the session.
const STATIC = { staleTime: 30 * 60 * 1000 };

export function useCountries() {
  return useApi(ep.getCountries, { query: { requestType: "FETCH", limit: 1000, sortBy: "name", sort: "ASC" } }, { ...STATIC,
    select: (r) => r?.items ?? [] }).data ?? [];
}

export function useEnabledCurrencies() {
  return useApi(ep.getEnabledCurrencyTypes, { query: { requestType: "FETCH", limit: 1000 } }, { ...STATIC,
    select: (r) => r?.items ?? [] }).data ?? [];
}

export function useEnabledValueChains() {
  return useApi(ep.getValueChainList, { query: { requestType: "FETCH", limit: 1000, valueChainStatus: "ENABLED" } }, { ...STATIC,
    select: (r) => r?.items ?? [] }).data ?? [];
}
