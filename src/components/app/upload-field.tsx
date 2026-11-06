import { FileText, Upload, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { type Control, type FieldPath, type FieldValues, type RegisterOptions, useController } from "react-hook-form";
import type { ApiDocument } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormFieldLabel } from "./form-fields";
import { Spinner } from "@/components/ui/spinner";
import { documentUrl } from "@/lib/api";
import { uploadFile } from "@/lib/http";
import { useTranslate } from "@refinedev/core";

export const IMAGE_TYPES = "image/png,image/jpeg,image/jpg";


export function UploadField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  accept,
  image,
  typeError,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** Show the required asterisk; defaults to whether `rules.required` is set. */
  required?: boolean;
  disabled?: boolean;
  className?: string;
  accept?: string;
  /** Show an image preview and upload with type IMAGE. */
  image?: boolean;
  /** Message for a file not matching `accept` (default: a generic one). */
  typeError?: string;
}) {
  const translate = useTranslate();
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doc = field.value as ApiDocument | null | undefined;

  async function onPick(file?: File) {
    if (!file) return;
    // `accept` may list MIME types and file extensions (".ttf"), as <input accept> does.
    const allowed = (token: string) => {
      const t = token.trim().toLowerCase();
      return t.startsWith(".") ? file.name.toLowerCase().endsWith(t) : file.type === t;
    };
    if (accept && !accept.split(",").some(allowed)) {
      setError(typeError ?? translate("common.errors.thisFileTypeIsNot"));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      field.onChange(await uploadFile(file, image));
    } catch {
      setError(translate("common.errors.uploadFailed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const href = documentUrl(doc?.storageKey);

  return (
    <Field className={className} data-invalid={!!fieldState.error || !!error || undefined}>
      {label && <FormFieldLabel required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <div className="flex items-center gap-3 rounded-md border border-dashed p-3">
        {doc?.storageKey || doc?.id != null ? (
          <>
            {image && href ? (
              <img src={href} alt="" className="size-14 rounded object-cover" />
            ) : (
              <FileText className="size-6 shrink-0 text-muted-foreground" />
            )}
            <a href={href} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs underline">
              {doc.name}
            </a>
            {!field.disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("buttons.remove")}
                onClick={() => field.onChange(null)}
              >
                <X />
              </Button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 text-xs text-muted-foreground">{translate("common.texts.noFileSelected")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={field.disabled || uploading}
              onClick={() => input.current?.click()}
            >
              {uploading ? <Spinner /> : <Upload />}
              {translate("buttons.upload")}
            </Button>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error, error ? { message: error } : undefined]} />
    </Field>
  );
}
