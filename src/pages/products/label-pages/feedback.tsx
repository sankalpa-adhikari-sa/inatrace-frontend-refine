import { useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Download } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { ApiProductLabelFeedback } from "@/client/types.gen";
import { RowActions, SimpleSelect, Toolbar, humanize } from "@/components/app/controls";
import { PageLoader } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useTableFilter } from "@/hooks/use-table-filter";
import { saveBlob } from "@/lib/download";
import { ep } from "@/lib/endpoints";
import { call, useApi } from "@/lib/http";
import { t } from "@/lib/i18n";
import { LabelPageHeader, useLabelParams } from "./shared";

const FEEDBACK_TYPES = [
  { value: "", get label() { return t("products.labelPages.fields.allTypes"); } },
  { value: "PRAISE", get label() { return t("products.labelPages.fields.praise"); } },
  { value: "PROPOSAL", get label() { return t("products.labelPages.fields.proposal"); } },
  { value: "COMPLAINT", get label() { return t("products.labelPages.fields.complaint"); } },
];

/** `/product-labels/:id/labels/:labelId/feedback` (ProductLabelFeedbackPageComponent) */
export function LabelFeedback() {
  const { labelId } = useLabelParams();
  const { data: label } = useApi(ep.getProductLabel, { path: { id: labelId } });
  if (!label?.uuid) return <PageLoader />;
  return <FeedbackTable labelUid={label.uuid} />;
}

function FeedbackTable({ labelUid }: { labelUid: string }) {
  const translate = useTranslate();
  const [viewing, setViewing] = useState<ApiProductLabelFeedback | null>(null);
  const columns = useMemo<ColumnDef<ApiProductLabelFeedback>[]>(
    () => [
      { id: "email", accessorKey: "email", header: translate("common.fields.eMail") },
      {
        id: "type",
        accessorKey: "type",
        header: translate("common.fields.type"),
        enableSorting: false,
        cell: ({ getValue }) => humanize(getValue() as string),
      },
      {
        id: "gender",
        accessorFn: (f) => humanize(f.questionnaireAnswers?.gender),
        header: translate("products.labelPages.fields.gender"),
      },
      {
        id: "age",
        accessorFn: (f) => f.questionnaireAnswers?.age,
        header: translate("products.labelPages.fields.age"),
      },
      {
        id: "feedback",
        accessorKey: "feedback",
        header: translate("products.labelPages.fields.feedback"),
        enableSorting: false,
        cell: ({ getValue }) => <span className="line-clamp-2 max-w-md whitespace-normal">{getValue() as string}</span>,
      },
      {
        id: "gdpr",
        accessorKey: "gdprConsent",
        header: translate("products.labelPages.fields.gdpr"),
        enableSorting: false,
        cell: ({ getValue }) =>
          getValue() ? (
            <Check
              className="size-4"
              aria-label={translate("products.labelPages.buttons.yes")}
            />
          ) : null,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: translate("common.fields.view"), onClick: () => setViewing(row.original) },
            ]}
          />
        ),
      },
    ],
    []
  );

  const table = useTable<ApiProductLabelFeedback>({
    columns,
    refineCoreProps: {
      resource: "label-feedbacks",
      meta: { labelUid },
      sorters: { initial: [{ field: "email", order: "asc" }] },
      syncWithLocation: true,
    },
  });
  const [type, setType] = useTableFilter(table, "type");
  const [downloading, setDownloading] = useState(false);

  async function downloadEmails() {
    setDownloading(true);
    try {
      const res = await call(ep.listProductLabelFeedbacks, { path: { labelUid }, query: { sort: "DESC" } });
      const emails = (res?.items ?? []).map((f) => f.email).filter(Boolean);
      saveBlob(
        new Blob([["Email,", ...emails.map((e) => `${e},`)].join("\n") + "\n"], { type: "text/csv" }),
        "feedback-emails.csv"
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <LabelPageHeader
        title={translate("products.labelPages.titles.feedback")}
        actions={
          <Button variant="outline" disabled={downloading} onClick={downloadEmails}>
            {downloading ? <Spinner /> : <Download />}
            {translate("products.labelPages.buttons.downloadEMails")}
          </Button>
        }
      />
      <Toolbar>
        <SimpleSelect
          options={FEEDBACK_TYPES}
          value={(type as string) ?? ""}
          onChange={(v) => setType(v)}
          className="w-44"
        />
        <span className="text-xs text-muted-foreground">
          {table.refineCore.result.total ?? 0} {translate("products.labelPages.titles.feedbacks")}
        </span>
      </Toolbar>
      <DataTable table={table} />
      {viewing && <FeedbackDialog feedback={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** Read-only FeedbackModalComponent. */
function FeedbackDialog({ feedback, onClose }: { feedback: ApiProductLabelFeedback; onClose: () => void }) {
  const translate = useTranslate();
  const product = feedback.productName || translate("products.labelPages.texts.theProduct");
  const answers = feedback.questionnaireAnswers ?? {};
  const rows: [string, ReactNode][] = [
    [translate("products.labelPages.fields.theProducersOfLookForward", { productName: product }), feedback.feedback],
    [
      translate("products.labelPages.fields.howWouldYouRateThe", { productName: product }),
      humanize(answers.rateTaste),
    ],
    [translate("products.labelPages.fields.age"), answers.age],
    [translate("products.labelPages.fields.gender"), humanize(answers.gender)],
    [translate("common.fields.eMail"), feedback.email],
    [translate("common.fields.type"), humanize(feedback.type)],
    [translate("products.labelPages.fields.gdprConsent"), feedback.gdprConsent ? translate("products.labelPages.buttons.yes") : translate("common.fields.no")],
    [translate("products.labelPages.fields.privacyPolicyConsent"), feedback.privacyPolicyConsent ? translate("products.labelPages.buttons.yes") : translate("common.fields.no")],
    [translate("products.labelPages.fields.termsOfUseConsent"), feedback.termsOfUseConsent ? translate("products.labelPages.buttons.yes") : translate("common.fields.no")],
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("products.labelPages.titles.feedback")}</DialogTitle>
        </DialogHeader>
        <dl className="flex flex-col gap-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
