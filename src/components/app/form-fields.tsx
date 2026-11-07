import type { ComponentProps, ReactNode } from "react";
import { type Control, type FieldPath, type FieldValues, type RegisterOptions, useController } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharCountTextarea } from "./char-count-textarea";
import { DatePicker } from "./date-picker";
import { type Option, SimpleCombobox, SimpleSelect } from "./controls";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** Show the required asterisk; defaults to whether `rules.required` is set. */
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Field label that marks required fields with a red asterisk. */
export function FormFieldLabel({
  required,
  children,
  ...props
}: ComponentProps<typeof FieldLabel> & { required?: unknown }) {
  return (
    <FieldLabel {...props}>
      <span>
        {children}
        {!!required && (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </span>
    </FieldLabel>
  );
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  type = "text",
  placeholder,
  autoComplete,
  readOnly,
}: BaseProps<T> & {
  type?: "text" | "email" | "password" | "number" | "url" | "tel";
  placeholder?: string;
  autoComplete?: string;
  /** Shown but not editable; unlike `disabled` the value is still submitted. */
  readOnly?: boolean;
}) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-invalid={!!fieldState.error || undefined}
        {...field}
        value={field.value ?? ""}
        onChange={(e) =>
          field.onChange(type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
        }
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

/** Calendar date picker over an ISO `yyyy-MM-dd` string ("" when empty). */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  min,
  max,
  placeholder,
  readOnly,
}: BaseProps<T> & {
  /** Earliest selectable day (ISO). */
  min?: string;
  /** Latest selectable day (ISO). */
  max?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const isRequired = required ?? !!rules?.required;
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={isRequired}>{label}</FormFieldLabel>}
      <DatePicker
        id={name}
        ref={field.ref}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        readOnly={readOnly}
        invalid={!!fieldState.error}
        clearable={!isRequired}
        min={min}
        max={max}
        placeholder={placeholder}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  rows = 4,
  placeholder,
}: BaseProps<T> & { rows?: number; placeholder?: string }) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  // With a length limit, show a live character count (CharCountTextarea).
  const limit = rules?.maxLength;
  const maxLength = typeof limit === "number" ? limit : limit?.value;
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>{label}</FormFieldLabel>}
      {maxLength != null ? (
        <CharCountTextarea
          id={name}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={!!fieldState.error || undefined}
          maxLength={maxLength}
          {...field}
          value={field.value ?? ""}
        />
      ) : (
        <Textarea
          id={name}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={!!fieldState.error || undefined}
          {...field}
          value={field.value ?? ""}
        />
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

export function SelectField<T extends FieldValues, V extends string | number>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  options,
  placeholder,
}: BaseProps<T> & { options: Option<V>[]; placeholder?: string }) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <SimpleSelect
        id={name}
        options={options}
        value={field.value}
        onChange={field.onChange}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!fieldState.error}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

/**
 * Like `SelectField` but typeahead-filtered on the client; for long option
 * lists (countries, codebooks). See `SearchSelectField` for server search.
 */
export function ComboboxField<T extends FieldValues, V extends string | number>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  options,
  placeholder = t("common.texts.typeToSearch"),
}: BaseProps<T> & { options: Option<V>[]; placeholder?: string }) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <SimpleCombobox
        id={name}
        options={options}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!fieldState.error}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

type EntityFieldProps<T extends FieldValues, E> = BaseProps<T> & {
  items: E[];
  getLabel: (item: E) => string;
  placeholder?: string;
};

/**
 * Select bound to an object-valued field (e.g. `measurementUnitType`), keyed
 * by `id`. The API expects the whole referenced object back.
 */
export function EntitySelectField<T extends FieldValues, E extends { id?: number }>(props: EntityFieldProps<T, E>) {
  return <EntityField {...props} />;
}

/** `EntitySelectField` with typeahead filtering, for long item lists. */
export function EntityComboboxField<T extends FieldValues, E extends { id?: number }>(props: EntityFieldProps<T, E>) {
  return <EntityField {...props} searchable />;
}

function EntityField<T extends FieldValues, E extends { id?: number }>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  items,
  getLabel,
  placeholder,
  searchable,
}: EntityFieldProps<T, E> & { searchable?: boolean }) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const current = field.value as E | null | undefined;
  // Keep the saved value selectable even when it is not among the current options.
  const all = current?.id != null && !items.some((i) => i.id === current.id) ? [...items, current] : items;
  const options = all.filter((i) => i.id != null).map((i) => ({ value: i.id as number, label: getLabel(i) }));
  const Control = searchable ? SimpleCombobox : SimpleSelect;
  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && (
        <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>
          {label}
        </FormFieldLabel>
      )}
      <Control
        // Ties the label to the control, so it has an accessible name.
        id={name}
        options={options}
        value={current?.id ?? null}
        onChange={(id) => field.onChange(all.find((i) => i.id === id) ?? null)}
        onBlur={field.onBlur}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!fieldState.error}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
}: BaseProps<T>) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  return (
    <Field orientation="horizontal" className={className} data-invalid={!!fieldState.error || undefined}>
      <Checkbox
        id={name}
        checked={!!field.value}
        onCheckedChange={(checked) => field.onChange(checked)}
        disabled={field.disabled}
        aria-invalid={!!fieldState.error || undefined}
      />
      <div className="flex flex-col gap-0.5">
        {label && (
          <FormFieldLabel htmlFor={name} className="font-normal" required={required ?? rules?.required}>
            {label}
          </FormFieldLabel>
        )}
        {description && <FieldDescription>{description}</FieldDescription>}
        <FieldError errors={[fieldState.error]} />
      </div>
    </Field>
  );
}


export function EntityListField<T extends FieldValues, E extends { id?: number }>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
  items,
  getLabel,
  placeholder = t("common.texts.selectToAdd"),
  confirmRemove,
  searchable,
}: BaseProps<T> & {
  items: E[];
  getLabel: (item: E) => string;
  placeholder?: string;
  /** Resolve false to keep the item. */
  confirmRemove?: (item: E) => Promise<boolean>;
  /** Type to filter the picker; for long item lists. */
  searchable?: boolean;
}) {
  const translate = useTranslate();
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const selected = (field.value as E[] | null) ?? [];
  const selectedIds = new Set(selected.map((s) => s.id));
  const options = items
    .filter((i) => i.id != null && !selectedIds.has(i.id))
    .map((i) => ({ value: i.id as number, label: getLabel(i) }));
  const Picker = searchable ? SimpleCombobox : SimpleSelect;

  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel htmlFor={name} required={required ?? rules?.required}>{label}</FormFieldLabel>}
      {!field.disabled && (
        <Picker
          id={name}
          // Remount after each add so the combobox input clears.
          key={selected.length}
          options={options}
          value={null}
          placeholder={options.length ? placeholder : translate("common.placeholders.nothingLeftToAdd")}
          disabled={!options.length}
          onChange={(id) => {
            const item = items.find((i) => i.id === id);
            if (item) field.onChange([...selected, item]);
          }}
        />
      )}
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <li
              key={s.id}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/50 py-0.5 pr-1 pl-2 text-xs"
            >
              {getLabel(items.find((i) => i.id === s.id) ?? s)}
              {!field.disabled && (
                <button
                  type="button"
                  aria-label={translate("buttons.remove")}
                  className="rounded px-1 text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    if (confirmRemove && !(await confirmRemove(s))) return;
                    field.onChange(selected.filter((x) => x.id !== s.id));
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{translate("common.texts.noneSelected")}</p>
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

export const EMAIL_PATTERN = {
  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  get message() { return t("common.errors.eMailIsInThe"); },
};
