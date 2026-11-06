import { useTranslate } from "@refinedev/core";
import { Trash2 } from "lucide-react";
import { type Control, useController } from "react-hook-form";
import type { ApiProcessingEvidenceField, ApiProcessingEvidenceType } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FormValues } from "./model";

type Evidence = ApiProcessingEvidenceField | ApiProcessingEvidenceType;

type EvidenceRow = ApiProcessingEvidenceField & Pick<ApiProcessingEvidenceType, "requiredOneOfGroupIdForQuote">;

export function EvidenceList({
  control,
  name,
  items,
  disabled,
  withGroup,
}: {
  control: Control<FormValues>;
  name: "requiredEvidenceFields" | "requiredDocumentTypes";
  items: Evidence[];
  disabled: boolean;
  withGroup?: boolean;
}) {
  const translate = useTranslate();
  const { field } = useController({ control, name });
  const selected = (field.value ?? []) as EvidenceRow[];
  const update = (i: number, patch: Partial<EvidenceRow>) =>
    field.onChange(selected.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  return (
    <div className="flex flex-col gap-2">
      <SimpleSelect
        options={items
          .filter((s) => !selected.some((o) => o.id === s.id))
          .map((s) => ({ value: s.id!, label: s.label ?? "" }))}
        value={null}
        disabled={disabled}
        placeholder={disabled ? translate("companies.processingActions.placeholders.selectAValueChainFirst") : translate("companies.processingActions.placeholders.add")}
        onChange={(id) => {
          const s = items.find((x) => x.id === id);
          if (s) field.onChange([...selected, { ...s, mandatory: false, requiredOnQuote: false }]);
        }}
      />
      {selected.length === 0 && <FieldDescription>{translate("companies.processingActions.descriptions.noneSelected")}</FieldDescription>}
      {selected.map((e, i) => (
        <div key={e.id} className="flex flex-wrap items-center gap-3 border-b pb-4 last:border-b-0 last:pb-0 text-xs">
          <span className="min-w-32 flex-1">{e.label}</span>
          <label className="flex items-center gap-1.5">
            <Checkbox checked={!!e.mandatory} onCheckedChange={(c) => update(i, { mandatory: c })} />
            {translate("companies.processingActions.fields.mandatory")}
          </label>
          <label className="flex items-center gap-1.5">
            <Checkbox checked={!!e.requiredOnQuote} onCheckedChange={(c) => update(i, { requiredOnQuote: c })} />
            {translate("companies.processingActions.fields.onQuote")}
          </label>
          {withGroup && (
            <label className="flex items-center gap-1.5">
              <Checkbox
                checked={e.requiredOneOfGroupIdForQuote != null}
                onCheckedChange={(c) => update(i, { requiredOneOfGroupIdForQuote: c ? "" : undefined })}
              />
              {translate("companies.processingActions.fields.inGroup")}
              {e.requiredOneOfGroupIdForQuote != null && (
                <Input
                  className="h-6 w-20"
                  placeholder={translate("companies.processingActions.placeholders.group")}
                  value={e.requiredOneOfGroupIdForQuote}
                  onChange={(ev) => update(i, { requiredOneOfGroupIdForQuote: ev.target.value })}
                />
              )}
            </label>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.remove")}
            onClick={() => field.onChange(selected.filter((_, j) => j !== i))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
