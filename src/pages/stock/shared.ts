import type { ApiStockOrder, ApiUserCustomer } from "@/client/types.gen";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";

export type WayOfPayment = NonNullable<ApiStockOrder["preferredWayOfPayment"]>;
export type StockOrderType = NonNullable<ApiStockOrder["orderType"]>;

export const WAYS_OF_PAYMENT: { value: WayOfPayment; label: string }[] = [
  { value: "CASH", get label() { return t("stock.payments.fields.cash"); } },
  { value: "CASH_VIA_COLLECTOR", get label() { return t("stock.payments.fields.cashViaCollector"); } },
  { value: "BANK_TRANSFER", get label() { return t("stock.payments.fields.bankTransfer"); } },
  { value: "CHEQUE", get label() { return t("stock.payments.fields.cheque"); } },
  { value: "OFFSETTING", get label() { return t("stock.payments.fields.offsetting"); } },
  { value: "UNKNOWN", get label() { return t("stock.fields.unknown"); } },
];

export const ORDER_TYPES: Record<StockOrderType, string> = {
  get PURCHASE_ORDER() { return t("stock.fields.purchaseOrder"); },
  get PROCESSING_ORDER() { return t("stock.fields.processingOrder"); },
  get GENERAL_ORDER() { return t("stock.fields.generalOrder"); },
  get TRANSFER_ORDER() { return t("stock.fields.transferOrder"); },
};

export const wayOfPaymentLabel = (v?: string) => WAYS_OF_PAYMENT.find((w) => w.value === v)?.label ?? v ?? "";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const fmt = (n?: number | null) => (n == null ? "" : numberFormat.format(n));

export const day = (d?: string | null) => (d ? d.slice(0, 10) : "");

export const personName = (u?: ApiUserCustomer | null) => (u ? `${u.name ?? ""} ${u.surname ?? ""}`.trim() : "");

/** yyyy-mm-dd for today, in local time. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Date input value → ISO date-time string the API expects. */
export const toApiDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00Z`).toISOString() : undefined);

/** Date input value → plain `yyyy-MM-dd`, for `format: date` query params (Java LocalDate). */
export const toApiDay = (d?: string | null) => (d ? d.slice(0, 10) : undefined);

/**
 * Company-role permissions from StockCoreTabComponent: accountants cannot
 * see processing / all stock, managers cannot edit payments, and users who
 * are not members of the company see neither.
 */
export function useStockPermissions() {
  const { user } = useIdentity();
  const { companyId } = useSelectedCompany();
  const { data: role, isLoading } = useApi(ep.getCompanyUsers, { path: { id: companyId ?? 0 } }, { enabled: companyId != null,
    select: (r) => (r ?? []).find((u) => u.id === user?.id)?.companyRole ?? null });
  const member = role != null;
  return {
    isLoading,
    canSeeProcessing: member && role !== "ACCOUNTANT",
    canSeeMyStock: member && role !== "ACCOUNTANT",
    canEditPayments: role !== "MANAGER",
  };
}
