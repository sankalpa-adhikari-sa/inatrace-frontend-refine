import { useNotification, useTranslate } from "@refinedev/core";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import type { ApiDocument, ApiUserCustomer, ApiUserCustomerImportRowValidationError } from "@/client/types.gen";
import { PageHeader, Section } from "@/components/app/page";
import { UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSelectedCompany } from "@/hooks/use-session";
import { getLocale, t } from "@/lib/i18n";
import { formatLocation } from "./list";
import { call, callRaw } from "@/lib/http";
import { ep } from "@/lib/endpoints";

const SPREADSHEET_TYPES = "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CELL_ERRORS: Record<string, string> = {
  get INCORRECT_TYPE() { return t("userCustomers.errors.theValueInTheCell"); },
  get REQUIRED() { return t("userCustomers.errors.theCellCannotBeEmpty"); },
  get INVALID_VALUE() { return t("userCustomers.errors.theProvidedValueInThe"); },
};

function templateFor(countryCode?: string) {
  if (countryCode === "RW") return "/farmer-import/Template_list_of_farmers_Rwanda_en.xlsx";
  if (countryCode === "HN") return "/farmer-import/Plantilla_listado_de_agricultores_Honduras_es.xlsx";
  if (getLocale() === "es") return "/farmer-import/Plantilla_listado_de_agricultores_otros_paises_es.xlsx";
  return "/farmer-import/Template_list_of_farmers_other_countries_en.xlsx";
}

/** `/my-farmers/import` */
export function FarmerImport() {
  const translate = useTranslate();
  const { company, companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const { control, watch } = useForm<{ file: ApiDocument | null }>({ defaultValues: { file: null } });
  const file = watch("file");
  const [importing, setImporting] = useState(false);
  const [duplicates, setDuplicates] = useState<ApiUserCustomer[]>([]);
  const [errors, setErrors] = useState<ApiUserCustomerImportRowValidationError[]>([]);

  async function runImport() {
    if (!file?.id || companyId == null) return;
    setImporting(true);
    setErrors([]);
    try {
      // This endpoint returns the import result directly, not in the usual envelope.
      const result = await callRaw(ep.importFarmersSpreadsheet, { path: { companyId, documentId: file.id } });
      if (!result) return;
      if (result.validationErrors?.length) {
        setErrors(result.validationErrors);
        notify?.({
          type: "error",
          message: translate("userCustomers.notifications.importFailed"),
          description: translate("userCustomers.notifications.thereAreValidationErrorsIn"),
        });
      } else if (result.duplicates?.length) {
        setDuplicates(result.duplicates);
        notify?.({
          type: "error",
          message: translate("userCustomers.notifications.duplicatesFound"),
          description: translate("userCustomers.notifications.someDuplicateFarmersWithSame"),
        });
      } else if (!result.successful) {
        notify?.({
          type: "error",
          message: translate("userCustomers.notifications.importFailed"),
          description: translate("userCustomers.notifications.noFarmersImported"),
        });
      } else {
        notify?.({
          type: "success",
          message: translate("userCustomers.notifications.farmersSuccessfullyImported"),
          description: translate("userCustomers.notifications.pleaseCheckTheDataOn"),
        });
        navigate("/my-farmers");
      }
    } finally {
      setImporting(false);
    }
  }

  async function accept(user: ApiUserCustomer, index: number) {
    await call(ep.addUserCustomer, { path: { companyId: companyId! }, body: user });
    notify?.({
      type: "success",
      message: translate("userCustomers.notifications.farmerSuccessfullyImported"),
    });
    setDuplicates((d) => d.filter((_, i) => i !== index));
  }

  return (
    <>
      <PageHeader title={translate("userCustomers.titles.importFarmers")} back="/my-farmers" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={translate("userCustomers.titles.template")}>
          <a
            href={templateFor(company?.headquarters?.country?.code)}
            className="flex items-center gap-2 text-sm underline underline-offset-4"
            download
          >
            <FileSpreadsheet className="size-5" />
            {translate("userCustomers.texts.clickToDownloadExcelTemplate")}
          </a>
        </Section>
        <Section title={translate("userCustomers.titles.uploadData")}>
          <UploadField
            control={control}
            name="file"
            label={translate("userCustomers.fields.spreadsheetOfFarmers")}
            description={translate("userCustomers.descriptions.uploadAnExcelSpreadsheetOf")}
            accept={SPREADSHEET_TYPES}
          />
          <Button className="self-start" disabled={!file || importing} onClick={runImport}>
            {importing && <Spinner />}
            {translate("userCustomers.buttons.import")}
          </Button>
        </Section>
      </div>

      {errors.length > 0 && (
        <Section title={translate("userCustomers.titles.validationErrors")}>
          <ul className="flex flex-col gap-2 text-xs">
            {errors.map((row) => (
              <li key={row.rowIndex}>
                <span className="font-medium">
                  {translate("userCustomers.errors.errorsInRow")} {(row.rowIndex ?? 0) + 1}:
                </span>
                <ul className="ml-4 list-disc">
                  {row.columnValidationErrors?.map((c) => (
                    <li key={c.cellAddress}>
                      {translate("userCustomers.errors.errorInCell", { cellAddress: c.cellAddress })}{" "}
                      {CELL_ERRORS[c.errorType ?? ""] ?? "/"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {duplicates.length > 0 && (
        <Section plain title={translate("userCustomers.titles.duplicates")}>
          <ul className="flex flex-col gap-2">
            {duplicates.map((d, i) => (
              <li
                key={`${d.name}-${d.surname}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs"
              >
                <span className="flex-1">
                  {d.name} {d.surname}, {formatLocation(d)}
                </span>
                <Button size="sm" onClick={() => accept(d, i)}>
                  {translate("userCustomers.buttons.accept")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDuplicates((x) => x.filter((_, j) => j !== i))}>
                  {translate("userCustomers.buttons.reject")}
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
