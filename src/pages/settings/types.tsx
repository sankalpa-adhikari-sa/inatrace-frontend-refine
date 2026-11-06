import { useCreate, useDelete, useList, useUpdate, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type {
  ApiFacilityType,
  ApiMeasureUnitType,
  ApiProcessingEvidenceField,
  ApiProcessingEvidenceType,
  ApiProductType,
  ApiSemiProduct,
} from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, humanize } from "@/components/app/controls";
import { CheckboxField, ComboboxField, EntityComboboxField, EntitySelectField, TextField } from "@/components/app/form-fields";
import { Section } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIdentity } from "@/hooks/use-session";
import { t } from "@/lib/i18n";

type TypeKey =
  | "semi-products"
  | "facility-types"
  | "measurement-unit-types"
  | "processing-evidence-types"
  | "processing-evidence-fields"
  | "product-types";

type AnyType = Omit<
  ApiFacilityType &
    ApiMeasureUnitType &
    ApiProcessingEvidenceType &
    ApiProcessingEvidenceField &
    ApiSemiProduct &
    ApiProductType,
  "translations"
> & { translations?: Translation[] };

const LANGUAGES = ["EN", "DE", "RW", "ES"] as const;
type Language = (typeof LANGUAGES)[number];

const CODE_RULES = {
  get required() { return t("settings.errors.idIsRequired"); },
  pattern: {
    value: /^[A-Z0-9_]+$/,
    get message() { return t("settings.errors.idShouldContainOnlyCapital"); },
  },
};

const EVIDENCE_TYPE_TYPES = ["DOCUMENT", "FIELD", "CALCULATED"].map((v) => ({ value: v, get label() { return humanize(v); } }));
const EVIDENCE_FIELD_TYPES = [
  "STRING",
  "TEXT",
  "NUMBER",
  "INTEGER",
  "DATE",
  "OBJECT",
  "PRICE",
  "EXCHANGE_RATE",
  "TIMESTAMP",
].map((v) => ({ value: v, get label() { return humanize(v); } }));

const yesNo = (v?: boolean) =>
  v ? (
    <Badge variant="secondary">{t("common.fields.yes")}</Badge>
  ) : (
    <span className="text-muted-foreground">{t("common.fields.no")}</span>
  );

type TypeConfig = {
  key: TypeKey;
  title: string;
  addTitle: string;
  editTitle: string;
  /** Has label translations (evidence types/fields) or name+description translations. */
  translations?: "label" | "nameDescription";
  columns: ColumnDef<AnyType>[];
  displayName: (t: AnyType) => string | undefined;
};

const TYPES: TypeConfig[] = [
  {
    key: "semi-products",
    get title() { return t("settings.titles.semiProducts"); },
    get addTitle() { return t("settings.titles.addNewSemiProduct"); },
    get editTitle() { return t("settings.titles.editSemiProduct"); },
    translations: "nameDescription",
    displayName: (t) => t.name,
    columns: [
      { accessorKey: "name", header: () => t("common.fields.name") },
      { accessorKey: "description", header: () => t("common.fields.description") },
      {
        accessorKey: "buyable",
        header: () => t("settings.fields.buyable"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
      {
        accessorKey: "sku",
        header: () => t("settings.fields.sku"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
      {
        accessorKey: "skuendCustomer",
        header: () => t("settings.fields.skuEndCustomer"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
    ],
  },
  {
    key: "facility-types",
    get title() { return t("settings.titles.facilityTypes"); },
    get addTitle() { return t("settings.titles.addFacilityType"); },
    get editTitle() { return t("settings.titles.editFacilityType"); },
    displayName: (t) => t.label,
    columns: [
      { accessorKey: "code", header: () => t("settings.fields.id") },
      { accessorKey: "label", header: () => t("common.fields.label") },
    ],
  },
  {
    key: "measurement-unit-types",
    get title() { return t("settings.titles.measurementUnitTypes"); },
    get addTitle() { return t("settings.titles.addMeasurementUnitType"); },
    get editTitle() { return t("settings.titles.editMeasurementUnitType"); },
    displayName: (t) => t.label,
    columns: [
      { accessorKey: "code", header: () => t("settings.fields.id") },
      { accessorKey: "label", header: () => t("common.fields.label") },
    ],
  },
  {
    key: "processing-evidence-types",
    get title() { return t("settings.titles.processingEvidenceTypes"); },
    get addTitle() { return t("settings.titles.addProcessingEvidenceType"); },
    get editTitle() { return t("settings.titles.editProcessingEvidenceType"); },
    translations: "label",
    displayName: (t) => t.label,
    columns: [
      { accessorKey: "code", header: () => t("settings.fields.id") },
      { accessorKey: "label", header: () => t("common.fields.label") },
      {
        accessorKey: "type",
        header: () => t("common.fields.type"),
        cell: ({ getValue }) => humanize(getValue<string>()),
      },
      {
        accessorKey: "fairness",
        header: () => t("settings.fields.fairness"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
      {
        accessorKey: "provenance",
        header: () => t("settings.fields.provenance"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
      {
        accessorKey: "quality",
        header: () => t("common.fields.quality"),
        cell: ({ getValue }) => yesNo(getValue<boolean>()),
      },
    ],
  },
  {
    key: "processing-evidence-fields",
    get title() { return t("common.titles.processingEvidenceFields"); },
    get addTitle() { return t("settings.titles.addProcessingEvidenceField"); },
    get editTitle() { return t("settings.titles.editProcessingEvidenceField"); },
    translations: "label",
    displayName: (t) => t.label,
    columns: [
      { accessorKey: "fieldName", header: () => t("settings.fields.fieldName") },
      { accessorKey: "label", header: () => t("common.fields.label") },
      {
        accessorKey: "type",
        header: () => t("common.fields.type"),
        cell: ({ getValue }) => humanize(getValue<string>()),
      },
    ],
  },
  {
    key: "product-types",
    get title() { return t("settings.titles.productTypes"); },
    get addTitle() { return t("settings.titles.addNewProductType"); },
    get editTitle() { return t("settings.titles.editProductType"); },
    translations: "nameDescription",
    displayName: (t) => t.name,
    columns: [
      { accessorKey: "code", header: () => t("settings.fields.code") },
      { accessorKey: "name", header: () => t("common.fields.name") },
      { accessorKey: "description", header: () => t("common.fields.description") },
    ],
  },
];

export function SettingsTypes() {
  return (
    <div className="flex flex-col gap-6">
      {TYPES.map((config) => (
        <TypeSection key={config.key} config={config} />
      ))}
    </div>
  );
}

function TypeSection({ config }: { config: TypeConfig }) {
  const translate = useTranslate();
  const { user } = useIdentity();
  // Regional admins may create types but only view existing ones.
  const readOnly = user?.role === "REGIONAL_ADMIN";
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();
  const [editing, setEditing] = useState<AnyType | "new" | null>(null);

  const columns = useMemo<ColumnDef<AnyType>[]>(
    () => [
      ...config.columns.map((c) => ({ ...c, enableSorting: false })),
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: readOnly
                  ? translate("common.fields.view")
                  : translate("common.fields.edit"),
                onClick: () => setEditing(row.original),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                disabled: readOnly,
                onClick: async () => {
                  const name = config.displayName(row.original);
                  if (
                    await confirm({
                      description: translate("settings.descriptions.areYouSureYouWant", { name }),
                      destructive: true,
                      confirmLabel: translate("buttons.remove"),
                    })
                  ) {
                    remove({ resource: config.key, id: row.original.id! });
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [config, readOnly, confirm, remove]
  );

  const table = useTable<AnyType>({
    columns,
    refineCoreProps: { resource: config.key, syncWithLocation: false },
  });

  return (
    <Section plain
      title={config.title}
      description={translate("common.descriptions.total", { total: table.refineCore.result.total ?? 0 })}
      actions={
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}>
          <Plus />
          {translate("settings.buttons.add")}
        </Button>
      }
    >
      <DataTable table={table} />
      {editing && (
        <TypeDialog
          config={config}
          record={editing === "new" ? null : editing}
          readOnly={readOnly && editing !== "new"}
          onClose={() => setEditing(null)}
        />
      )}
    </Section>
  );
}

type Translation = { language: Language; label?: string; name?: string; description?: string };

/** One translation row per supported language, filled from the record. */
function withAllLanguages(translations: Translation[] | undefined): Translation[] {
  return LANGUAGES.map((language) => {
    const t = translations?.find((x) => x.language === language);
    return { language, label: t?.label ?? "", name: t?.name ?? "", description: t?.description ?? "" };
  });
}

function TypeDialog({
  config,
  record,
  readOnly,
  onClose,
}: {
  config: TypeConfig;
  record: AnyType | null;
  readOnly: boolean;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const { mutate: create, mutation: createMutation } = useCreate();
  const { mutate: update, mutation: updateMutation } = useUpdate();
  const { key } = config;
  const needsUnits = key === "semi-products" || key === "measurement-unit-types";
  const { result: units } = useList<ApiMeasureUnitType>({
    resource: "measurement-unit-types",
    pagination: { mode: "off" },
    queryOptions: { enabled: needsUnits },
  });

  const { control, handleSubmit, getValues } = useForm<AnyType & { translations: Translation[] }>({
    disabled: readOnly,
    defaultValues: {
      ...(record ?? {}),
      translations: withAllLanguages(record?.translations),
    } as AnyType & { translations: Translation[] },
  });

  function submit(values: AnyType & { translations: Translation[] }) {
    const data: Record<string, unknown> = { ...values };
    const english = values.translations.find((t) => t.language === "EN");

    if (config.translations === "label") {
      data.translations = values.translations.map(({ language, label }) => ({ language, label }));
      data.label = english?.label;
    } else if (config.translations === "nameDescription") {
      data.translations = values.translations.map(({ language, name, description }) => ({
        language,
        name,
        description,
      }));
      data.name = english?.name;
      data.description = english?.description;
    } else {
      delete data.translations;
    }
    if (key === "measurement-unit-types" && (data.weight === "" || data.weight == null)) data.weight = null;
    for (const k of Object.keys(data)) if (data[k] == null) delete data[k];

    const options = { onSuccess: onClose };
    if (record?.id != null) update({ resource: key, id: record.id, values: data }, options);
    else create({ resource: key, values: data }, options);
  }

  const englishRequired = (field: "label" | "name") => ({
    validate: (_: unknown) =>
      !!getValues("translations")
        .find((t) => t.language === "EN")
        ?.[field]?.trim() || translate("settings.errors.theEnglishTranslationIsRequired"),
  });

  const unitItems = (units?.data ?? []).filter((u) => u.id !== record?.id);
  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record ? config.editTitle : config.addTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <FieldGroup>
            {(key === "facility-types" || key === "measurement-unit-types" || key === "processing-evidence-types") && (
              <TextField
                control={control}
                name="code"
                label={translate("settings.fields.id")}
                rules={CODE_RULES}
              />
            )}
            {key === "product-types" && (
              <TextField
                control={control}
                name="code"
                label={translate("settings.fields.code")}
                rules={{ required: translate("settings.errors.codeIsRequired") }}
              />
            )}
            {key === "processing-evidence-fields" && (
              <TextField
                control={control}
                name="fieldName"
                label={translate("settings.fields.fieldName")}
                rules={{
                  ...CODE_RULES,
                  required: translate("settings.errors.fieldNameIsRequired"),
                }}
              />
            )}
            {(key === "facility-types" || key === "measurement-unit-types") && (
              <TextField
                control={control}
                name="label"
                label={translate("common.fields.label")}
                rules={{ required: translate("settings.errors.labelIsRequired") }}
              />
            )}
            {key === "measurement-unit-types" && (
              <>
                <TextField
                  control={control}
                  name="weight"
                  type="number"
                  label={translate("settings.fields.weightInKg")}
                />
                <EntitySelectField
                  control={control}
                  name="underlyingMeasurementUnitType"
                  label={translate("settings.fields.underlyingMeasureUnit")}
                  items={unitItems}
                  getLabel={(u) => u.label ?? ""}
                />
              </>
            )}

            {config.translations && (
              <div className="flex flex-col gap-2">
                <FieldDescription>{translate("settings.descriptions.fillInTheTranslationsEnglish")}</FieldDescription>
                <Tabs defaultValue="EN" className="flex-col">
                  <TabsList>
                    {LANGUAGES.map((l) => (
                      <TabsTrigger key={l} value={l}>
                        {l}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {LANGUAGES.map((l, i) => (
                    <TabsContent key={l} value={l} keepMounted className="flex flex-col gap-3 pt-2">
                      {config.translations === "label" ? (
                        <TextField
                          control={control}
                          name={`translations.${i}.label`}
                          label={translate("common.fields.label")}
                          rules={l === "EN" ? englishRequired("label") : undefined}
                          required={l === "EN"}
                        />
                      ) : (
                        <>
                          <TextField
                            control={control}
                            name={`translations.${i}.name`}
                            label={translate("common.fields.name")}
                            rules={l === "EN" ? englishRequired("name") : undefined}
                            required={l === "EN"}
                          />
                          <TextField
                            control={control}
                            name={`translations.${i}.description`}
                            label={translate("common.fields.description")}
                          />
                        </>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {key === "semi-products" && (
              <>
                <EntityComboboxField
                  control={control}
                  name="measurementUnitType"
                  label={translate("settings.fields.measurementUnitType")}
                  items={unitItems}
                  getLabel={(u) => u.label ?? ""}
                  rules={{ required: translate("settings.errors.measurementUnitTypeIsRequired") }}
                />
                <CheckboxField control={control} name="buyable" label={translate("settings.fields.semiProductIsBuyable")} />
                <CheckboxField control={control} name="sku" label={translate("settings.fields.semiProductIsSku")} />
                <CheckboxField
                  control={control}
                  name="skuendCustomer"
                  label={translate("settings.fields.semiProductIsSkuFor")}
                />
              </>
            )}
            {(key === "processing-evidence-types" || key === "processing-evidence-fields") && (
              <ComboboxField
                control={control}
                name="type"
                label={translate("common.fields.type")}
                options={key === "processing-evidence-types" ? EVIDENCE_TYPE_TYPES : EVIDENCE_FIELD_TYPES}
                rules={{ required: translate("common.errors.typeIsRequired") }}
              />
            )}
            {key === "processing-evidence-types" && (
              <>
                <CheckboxField
                  control={control}
                  name="fairness"
                  label={translate("settings.fields.fairness")}
                />
                <CheckboxField
                  control={control}
                  name="provenance"
                  label={translate("settings.fields.provenance")}
                />
                <CheckboxField
                  control={control}
                  name="quality"
                  label={translate("common.fields.quality")}
                />
              </>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {readOnly
                ? translate("buttons.close")
                : translate("buttons.cancel")}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                {translate("buttons.save")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
