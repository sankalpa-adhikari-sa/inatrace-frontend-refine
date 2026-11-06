import { FileText, Link2, Pencil, Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { type Control, type FieldValues, type Path, useController, useForm } from "react-hook-form";
import type { ApiCompanyDocument } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { TextField, TextareaField } from "./form-fields";
import { IMAGE_TYPES, UploadField } from "./upload-field";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

type Category = NonNullable<ApiCompanyDocument["category"]>;

const META: Record<Category, { add: string; icon: typeof FileText; type: "LINK" | "FILE" }> = {
  VIDEO: { get add() { return t("buttons.addVideo"); }, icon: Link2, type: "LINK" },
  PRODUCTION_RECORD: { get add() { return t("buttons.addProductionRecord"); }, icon: FileText, type: "FILE" },
  MEET_THE_FARMER: { get add() { return t("buttons.addFarmer"); }, icon: User, type: "FILE" },
};

/**
 * Edits the documents of one category inside a company's `documents` array
 * (port of company-document-item inside list-editor).
 */
export function CompanyDocumentsField<T extends FieldValues>({
  control,
  name,
  category,
  disabled,
}: {
  control: Control<T>;
  name: Path<T>;
  category: Category;
  disabled?: boolean;
}) {
  const translate = useTranslate();
  const { field } = useController({ control, name, disabled });
  const all = (field.value as ApiCompanyDocument[] | null) ?? [];
  const [editing, setEditing] = useState<{ index: number | null; doc: ApiCompanyDocument } | null>(null);
  const { icon: Icon, add, type } = META[category];

  const items = all.map((doc, index) => ({ doc, index })).filter((x) => x.doc.category === category);

  function save(doc: ApiCompanyDocument) {
    const next = [...all];
    if (editing?.index != null) next[editing.index] = doc;
    else next.push(doc);
    field.onChange(next);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <p className="text-xs text-muted-foreground">{translate("common.texts.noneAdded")}</p>}
      {items.map(({ doc, index }) => (
        <div key={index} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{category === "MEET_THE_FARMER" ? doc.name : doc.description}</span>
          {!field.disabled && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("buttons.edit")}
                onClick={() => setEditing({ index, doc })}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("buttons.remove")}
                onClick={() => field.onChange(all.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      ))}
      {!field.disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setEditing({ index: null, doc: { category, type } })}
        >
          <Plus />
          {add}
        </Button>
      )}
      {editing && (
        <DocumentDialog doc={editing.doc} category={category} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function DocumentDialog({
  doc,
  category,
  onCancel,
  onSave,
}: {
  doc: ApiCompanyDocument;
  category: Category;
  onCancel: () => void;
  onSave: (doc: ApiCompanyDocument) => void;
}) {
  const translate = useTranslate();
  const { control, handleSubmit } = useForm<ApiCompanyDocument>({ defaultValues: doc });
  const descriptionRules = {
    required: translate("common.errors.descriptionIsRequired"),
    maxLength: { value: 2000, message: translate("common.errors.atMost2000Characters") },
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{META[category].add}</DialogTitle>
        </DialogHeader>
        {/* Nested inside the company form: stop the submit from bubbling to it. */}
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(onSave)(e);
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            {category === "MEET_THE_FARMER" && (
              <>
                <TextField
                  control={control}
                  name="name"
                  label={translate("common.fields.farmerName")}
                  rules={{ required: translate("common.errors.farmerNameIsRequired") }}
                />
                <TextareaField
                  control={control}
                  name="description"
                  label={translate("common.fields.farmerDescription")}
                  rules={descriptionRules}
                />
                <TextareaField
                  control={control}
                  name="quote"
                  label={translate("common.fields.quote")}
                  rules={{
                    required: translate("common.errors.quoteIsRequired"),
                    maxLength: { value: 2000, message: translate("common.errors.atMost2000Characters") },
                  }}
                />
                <UploadField
                  control={control}
                  name="document"
                  label={translate("common.fields.farmerPhoto")}
                  image
                  accept={IMAGE_TYPES}
                  rules={{ required: translate("common.errors.photoIsRequired") }}
                />
              </>
            )}
            {category === "PRODUCTION_RECORD" && (
              <>
                <TextareaField
                  control={control}
                  name="description"
                  label={translate("common.fields.description")}
                  rules={descriptionRules}
                />
                <UploadField
                  control={control}
                  name="document"
                  label={translate("common.fields.photo")}
                  image
                  accept={IMAGE_TYPES}
                  rules={{ required: translate("common.errors.photoIsRequired") }}
                />
              </>
            )}
            {category === "VIDEO" && (
              <>
                <TextareaField
                  control={control}
                  name="description"
                  label={translate("common.fields.videoDescription")}
                  rules={descriptionRules}
                />
                <TextField
                  control={control}
                  name="link"
                  type="url"
                  label={translate("common.fields.link")}
                  rules={{ required: translate("common.errors.linkIsRequired") }}
                />
              </>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {translate("buttons.cancel")}
            </Button>
            <Button type="submit">
              {translate("buttons.done")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
