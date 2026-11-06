import { MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

export type Option<V extends string | number = string> = { value: V; label: string };

/** Single-value select over a plain option list ("" / null means none). */
export function SimpleSelect<V extends string | number>({
  options,
  value,
  onChange,
  placeholder = t("common.texts.select"),
  className,
  disabled,
  invalid,
  prefix,
  id,
}: {
  options: Option<V>[];
  value: V | null | undefined;
  onChange: (value: V | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Inline label shown inside the trigger, for label-less toolbars. */
  prefix?: ReactNode;
  /** Id of the trigger, so a <label htmlFor> names it. */
  id?: string;
}) {
  // Base UI treats "" as "nothing selected"; map it to a sentinel so an
  // explicit "All …" option with value "" still shows as selected.
  const EMPTY = "__empty__";
  const enc = (v: V | null | undefined): string | number | null => (v === "" ? EMPTY : v ?? null);
  const dec = (v: unknown) => (v === EMPTY ? "" : v) as V | null;
  const items = options.map((o) => ({ value: enc(o.value), label: o.label }));

  return (
    <Select<string | number>
      items={items}
      value={enc(value)}
      onValueChange={(v) => onChange(dec(v) ?? null)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn("w-full", prefix && "justify-start [&>svg:last-child]:ml-auto", className)}
        aria-invalid={invalid || undefined}
      >
        {prefix && <span className="shrink-0 text-muted-foreground">{prefix}</span>}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={String(o.value)} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Typeahead variant of `SimpleSelect`, filtered on the client. */
export function SimpleCombobox<V extends string | number>({
  options,
  value,
  onChange,
  placeholder = t("common.texts.typeToSearch"),
  className,
  disabled,
  invalid,
  id,
  onBlur,
  prefix,
  clearable = true,
}: {
  options: Option<V>[];
  value: V | null | undefined;
  onChange: (value: V | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  onBlur?: () => void;
  /** Inline label shown inside the input, for label-less toolbars. */
  prefix?: ReactNode;
  clearable?: boolean;
}) {
  const translate = useTranslate();
  // Base UI compares `items` and `value` by reference and re-syncs on every
  // change, so callers' inline option arrays must not get a new identity on
  // each render (that loops). Rebuild only when the options actually change.
  const optionsKey = JSON.stringify(options.map((o) => [o.value, o.label]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => options, [optionsKey]);
  const selected = useMemo(() => items.find((o) => o.value === value) ?? null, [items, value]);
  return (
    <Combobox<Option<V>>
      items={items}
      value={selected}
      disabled={disabled}
      itemToStringLabel={(o) => o?.label ?? ""}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      onValueChange={(o) => onChange(o?.value ?? null)}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        showClear={clearable && !!selected && !disabled}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onBlur={onBlur}
        className={cn("w-full", className)}
      >
        {prefix && (
          <InputGroupAddon align="inline-start" className="text-muted-foreground">
            {prefix}
          </InputGroupAddon>
        )}
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>
          {translate("common.fields.nothingFound")}
        </ComboboxEmpty>
        <ComboboxList>
          {(o: Option<V>) => (
            <ComboboxItem key={String(o.value)} value={o}>
              {o.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = t("common.texts.search"),
  delay = 250,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");

  useEffect(() => setText(value ?? ""), [value]);

  useEffect(() => {
    if (text === (value ?? "")) return;
    const t = setTimeout(() => onChange(text), delay);
    return () => clearTimeout(t);
    // only react to typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <InputGroup className={cn("w-full sm:w-64", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
    </InputGroup>
  );
}

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ENABLED: "default",
  REGISTERED: "secondary",
  CONFIRMED_EMAIL: "secondary",
  UNCONFIRMED: "outline",
  DEACTIVATED: "destructive",
  DISABLED: "destructive",
};

/**
 * Label for a backend enum value ("COMPANY_ADMIN"): its `enums.<VALUE>` translation, or the value
 * made readable ("Company admin") when there is none.
 */
export function humanize(value?: string | null) {
  if (!value) return "";
  const s = value.replace(/_/g, " ").toLowerCase();
  return t(`enums.${value}`, { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) });
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Badge variant={STATUS_TONE[status] ?? "outline"}>{humanize(status)}</Badge>;
}

export type RowAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  separatorBefore?: boolean;
};

export function RowActions({ actions }: { actions: RowAction[] }) {
  const translate = useTranslate();
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translate("buttons.actions")}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visible.map((a) => (
          <div key={a.label}>
            {a.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={a.destructive ? "destructive" : "default"}
              disabled={a.disabled}
              onClick={a.onClick}
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Secondary filters behind a button, with a count of the active ones. */
export function FilterPopover({ count, onReset, children }: { count: number; onReset: () => void; children: ReactNode }) {
  const translate = useTranslate();
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal />
        {translate("common.texts.filters")}
        {count > 0 && <Badge className="h-4 min-w-4 px-1 tabular-nums">{count}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="gap-3">
        <PopoverHeader className="flex-row items-center justify-between">
          <PopoverTitle>{translate("common.titles.filters")}</PopoverTitle>
          <Button variant="ghost" size="sm" disabled={count === 0} onClick={onReset}>
            {translate("buttons.reset")}
          </Button>
        </PopoverHeader>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
