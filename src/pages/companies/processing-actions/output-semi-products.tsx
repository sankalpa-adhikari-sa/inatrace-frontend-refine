import { useTranslate } from "@refinedev/core";
import { Trash2 } from "lucide-react";
import { type Control, useController } from "react-hook-form";
import type { ApiProcessingActionOutputSemiProduct } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type FormValues } from "./model";

export function OutputSemiProducts({
  control,
  items,
  disabled,
}: {
  control: Control<FormValues>;
  items: ApiProcessingActionOutputSemiProduct[];
  disabled: boolean;
}) {
  const translate = useTranslate();
  const { field, fieldState } = useController({
    control,
    name: "outputSemiProducts",
    rules: { validate: (v) => (Array.isArray(v) && v.length > 0) || translate("companies.processingActions.errors.atLeastOneOutputSemi") },
  });
  const outputs = (field.value ?? []) as ApiProcessingActionOutputSemiProduct[];
  const update = (i: number, patch: Partial<ApiProcessingActionOutputSemiProduct>) =>
    field.onChange(outputs.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>
        {translate("companies.processingActions.fields.outputSemiProducts")}
      </FieldLabel>
      <SimpleSelect
        options={items
          .filter((s) => !outputs.some((o) => o.id === s.id))
          .map((s) => ({ value: s.id!, label: s.name ?? "" }))}
        value={null}
        disabled={disabled}
        placeholder={disabled ? translate("companies.processingActions.placeholders.selectAValueChainFirst") : translate("companies.processingActions.placeholders.addOutputSemiProduct")}
        onChange={(id) => {
          const s = items.find((x) => x.id === id);
          if (s) field.onChange([...outputs, { ...s, repackedOutput: false }]);
        }}
      />
      {outputs.map((o, i) => (
        <div key={o.id} className="flex flex-wrap items-center gap-3 border-b pb-4 last:border-b-0 last:pb-0 text-xs">
          <span className="min-w-32 flex-1 font-medium">{o.name}</span>
          <label className="flex items-center gap-2">
            <Checkbox checked={!!o.repackedOutput} onCheckedChange={(c) => update(i, { repackedOutput: c })} />
            {translate("companies.processingActions.fields.repackedOutput")}
          </label>
          {o.repackedOutput && (
            <Input
              type="number"
              className="w-36"
              placeholder={translate("companies.processingActions.placeholders.maxOutputWeight")}
              value={o.maxOutputWeight ?? ""}
              onChange={(e) =>
                update(i, { maxOutputWeight: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.remove")}
            onClick={() => field.onChange(outputs.filter((_, j) => j !== i))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
    </div>
  );
}
