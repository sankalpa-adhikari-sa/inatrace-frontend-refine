import { useTranslate } from "@refinedev/core";
import { type Control, type FieldPath, useController } from "react-hook-form";
import type { ApiProductLabelCompanyDocument } from "@/client/types.gen";
import { Section } from "@/components/app/page";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { documentUrl } from "@/lib/api";
import { type Media, type FormValues } from "./model";

/** DocumentPreviewComponent: a link opens in a new tab, a file shows its name. */
export function DocumentPreview({ doc, fallback }: { doc: ApiProductLabelCompanyDocument; fallback: string }) {
  if (doc.type === "LINK" && doc.link)
    return (
      <a
        href={doc.link}
        target="_blank"
        rel="noreferrer"
        className="truncate underline"
        onClick={(e) => e.stopPropagation()}
      >
        {doc.link}
      </a>
    );
  if (doc.type === "FILE" && doc.document?.storageKey)
    return (
      <a
        href={documentUrl(doc.document.storageKey)}
        target="_blank"
        rel="noreferrer"
        className="truncate underline"
        onClick={(e) => e.stopPropagation()}
      >
        {doc.name || doc.description || fallback}
      </a>
    );
  return <span className="truncate">{doc.name || doc.description || fallback}</span>;
}

/** Company documents shown on this label (videos: at most one active). */
export function MediaSection({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const groups: {
    key: keyof Media;
    title: string;
    single?: boolean;
    name: (d: ApiProductLabelCompanyDocument) => string;
  }[] = [
    {
      key: "video",
      title: translate("products.productPage.titles.videos"),
      single: true,
      name: (d) => d.description || d.link || translate("products.productPage.fields.video"),
    },
    {
      key: "farmers",
      title: translate("products.productPage.titles.meetTheFarmers"),
      name: (d) => d.name || translate("common.fields.farmer"),
    },
    {
      key: "productionRecord",
      title: translate("products.productPage.titles.productionRecords"),
      name: (d) => d.description || translate("products.productPage.fields.record"),
    },
  ];
  return (
    <Section
      title={translate("products.productPage.titles.media")}
      description={translate("products.productPage.descriptions.companyDocumentsCompanySettingsProfile")}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((g) => (
          <MediaGroup key={g.key} control={control} group={g} />
        ))}
      </div>
    </Section>
  );
}

function MediaGroup({
  control,
  group,
}: {
  control: Control<FormValues>;
  group: { key: keyof Media; title: string; single?: boolean; name: (d: ApiProductLabelCompanyDocument) => string };
}) {
  const translate = useTranslate();
  const { field } = useController({ control, name: `media.${group.key}` as FieldPath<FormValues> });
  const docs = (field.value ?? []) as ApiProductLabelCompanyDocument[];
  const toggle = (i: number, on: boolean) =>
    field.onChange(
      docs.map((d, j) => (j === i ? { ...d, active: on } : group.single && on ? { ...d, active: false } : d))
    );
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{group.title}</FieldLabel>
      {docs.length === 0 && <p className="text-xs text-muted-foreground">{translate("products.productPage.texts.noneInTheCompanyProfile")}</p>}
      {docs.map((d, i) => (
        <label key={d.id ?? i} className="flex items-center gap-2 text-xs">
          <Checkbox checked={!!d.active} onCheckedChange={(c) => toggle(i, !!c)} disabled={field.disabled} />
          <DocumentPreview doc={d} fallback={group.name(d)} />
        </label>
      ))}
    </div>
  );
}
