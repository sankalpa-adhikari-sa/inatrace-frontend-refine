import { useTranslate } from "@refinedev/core";
import { Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray } from "react-hook-form";
import type { ApiCompanyListResponse } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import type { UserCustomerType } from "../list";
import type { FormValues } from "./model";

/** Companies this farmer / collector supplies. */
export function Cooperatives({
  control,
  companyId,
  companyName,
  type,
}: {
  control: Control<FormValues>;
  companyId: number;
  companyName: string;
  type: UserCustomerType;
}) {
  const translate = useTranslate();
  const { fields, append, remove } = useFieldArray({ control, name: "cooperatives", keyName: "key" });
  const hasCurrent = fields.some((f) => f.company?.id === companyId);
  return (
    <div className="flex flex-col gap-2">
      {fields.map((f, i) => (
        <div key={f.key} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span className="flex-1">{f.company?.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.remove")}
            onClick={() => remove(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {!hasCurrent && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => append({ company: { id: companyId, name: companyName }, userCustomerType: type })}
        >
          <Plus />
          {translate("userCustomers.buttons.add", { one: companyName })}
        </Button>
      )}
    </div>
  );
}

/** Associations this farmer / collector is a member of. */
export function Associations({
  control,
  associations,
}: {
  control: Control<FormValues>;
  associations: ApiCompanyListResponse[];
}) {
  const translate = useTranslate();
  const { fields, append, remove } = useFieldArray({ control, name: "associations", keyName: "key" });
  const taken = new Set(fields.map((f) => f.company?.id));
  return (
    <div className="flex flex-col gap-2">
      <FieldDescription>
        {translate("userCustomers.descriptions.memberOfAssociations")}
      </FieldDescription>
      <SimpleSelect
        options={associations.filter((a) => !taken.has(a.id)).map((a) => ({ value: a.id!, label: a.name ?? "" }))}
        value={null}
        placeholder={translate("userCustomers.placeholders.typeAssociation")}
        onChange={(id) => {
          const a = associations.find((x) => x.id === id);
          if (a) append({ company: { id: a.id, name: a.name } });
        }}
      />
      {fields.map((f, i) => (
        <div key={f.key} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <span className="flex-1">{f.company?.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.remove")}
            onClick={() => remove(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}
