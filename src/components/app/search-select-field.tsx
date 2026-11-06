import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { type Control, type FieldPath, type FieldValues, type RegisterOptions, useController } from "react-hook-form";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormFieldLabel } from "./form-fields";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

/**
 * Server-searched single select bound to an object-valued field (port of
 * single-choice backed by a remote codebook, e.g. farmers of a company).
 */
export function SearchSelectField<T extends FieldValues, E extends { id?: number }>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  queryKey,
  search,
  getLabel,
  placeholder = t("common.texts.typeToSearch"),
  onSelect,
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
  /** Stable key identifying the search source (query text is appended). */
  queryKey: unknown[];
  search: (query: string) => Promise<E[]>;
  getLabel: (item: E) => string;
  placeholder?: string;
  onSelect?: (item: E | null) => void;
}) {
  const translate = useTranslate();
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 250);
    return () => clearTimeout(t);
  }, [input]);

  const { data: items = [] } = useQuery({
    queryKey: [...queryKey, debounced],
    queryFn: () => search(debounced),
    enabled: !field.disabled,
    placeholderData: (prev) => prev,
  });

  const value = (field.value as E | null | undefined) ?? null;

  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <Combobox<E>
        items={items}
        value={value}
        // Results are already filtered by the server.
        filter={null}
        disabled={field.disabled}
        itemToStringLabel={(item) => (item ? getLabel(item) : "")}
        isItemEqualToValue={(a, b) => a?.id === b?.id}
        onInputValueChange={(v) => setInput(v)}
        onValueChange={(item) => {
          field.onChange(item ?? null);
          onSelect?.(item ?? null);
        }}
      >
        <ComboboxInput
          placeholder={placeholder}
          showClear={!!value && !field.disabled}
          aria-invalid={!!fieldState.error || undefined}
          className="w-full"
        />
        <ComboboxContent>
          <ComboboxEmpty>
            {translate("common.fields.nothingFound")}
          </ComboboxEmpty>
          <ComboboxList>
            {(item: E) => (
              <ComboboxItem key={item.id} value={item}>
                {getLabel(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
