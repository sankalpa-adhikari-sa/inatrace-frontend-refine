import type { ApiPayment } from "@/client/types.gen";
import { t } from "@/lib/i18n";

export type PurposeType = NonNullable<ApiPayment["paymentPurposeType"]>;


export const PAYMENT_PURPOSES: { value: PurposeType; label: string }[] = [
  { value: "ADVANCE_PAYMENT", get label() { return t("stock.payments.fields.advancedPayment"); } },
  { value: "FIRST_INSTALLMENT", get label() { return t("stock.payments.fields.basePayment"); } },
  { value: "SECOND_INSTALLMENT", get label() { return t("stock.payments.fields.memberBonus"); } },
  { value: "WOMEN_PREMIUM", get label() { return t("stock.payments.fields.womenPremium"); } },
  { value: "INVOICE_PAYMENT", get label() { return t("stock.payments.fields.invoicePayment"); } },
];
export const purposeLabel = (v?: string) => PAYMENT_PURPOSES.find((p) => p.value === v)?.label ?? v ?? "";

/** Payment types; "Cash via collector" only when the payment has a collector (createPaymentTypes). */
export function paymentTypes(withCollector: boolean) {
  return [
    { value: "CASH", label: t("stock.payments.fields.cash") },
    {
      value: "BANK_TRANSFER",
      label: t("stock.payments.fields.bankTransfer"),
    },
    ...(withCollector
      ? [
          {
            value: "CASH_VIA_COLLECTOR",
            label: t("stock.payments.fields.cashViaCollector"),
          },
        ]
      : []),
    { value: "CHEQUE", label: t("stock.payments.fields.cheque") },
    {
      value: "OFFSETTING",
      label: t("stock.payments.fields.offsetting"),
    },
  ];
}
export const paymentTypeLabel = (v?: string) => paymentTypes(true).find((p) => p.value === v)?.label ?? v ?? "";

export const RECEIPT_TYPES = [
  { value: "PURCHASE_SHEET", get label() { return t("stock.payments.fields.purchaseSheet"); } },
  { value: "RECEIPT", get label() { return t("stock.payments.fields.receipt"); } },
];

/** "Label (suffix)", or just the label when there's no suffix (getCurrencyString / getUnitLabelString). */
export const withSuffix = (label: string, suffix?: string | null) => (suffix ? `${label} (${suffix})` : label);

