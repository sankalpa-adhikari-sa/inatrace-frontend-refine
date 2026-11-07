import { addYears, format, isValid, parseISO, type Locale } from "date-fns";
import { de, enUS, es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { type Ref, useState } from "react";
import { useGetLocale, useTranslate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";

// date-fns has no Kinyarwanda locale; rw falls back to English month names.
const LOCALES: Record<string, Locale> = { de, es };

/** date-fns locale for the current UI language. */
export function useDateLocale(): Locale {
  const lng = useGetLocale()()?.slice(0, 2) ?? "en";
  return LOCALES[lng] ?? enUS;
}

/** Parses an ISO day; empty or malformed input gives undefined instead of an Invalid Date. */
export function parseDay(value: string | null | undefined) {
  if (!value) return undefined;
  const d = parseISO(value.slice(0, 10));
  return isValid(d) ? d : undefined;
}

/**
 * Single-day calendar picker over ISO `yyyy-MM-dd` strings ("" = no date).
 * `min` / `max` (ISO) limit the selectable days; with `clearable` the popover
 * offers a Clear button.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  max,
  id,
  ref,
  disabled,
  readOnly,
  invalid,
  clearable,
  placeholder,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  disabled?: boolean;
  /** Shown but not editable. */
  readOnly?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const translate = useTranslate();
  const locale = useDateLocale();
  const [open, setOpen] = useState(false);
  const selected = parseDay(value);
  const minDate = parseDay(min);
  const maxDate = parseDay(max);
  const now = new Date();

  const pick = (d: string) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o && !readOnly)}>
      <PopoverTrigger
        id={id}
        ref={ref}
        disabled={disabled}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal aria-invalid:border-destructive aria-invalid:ring-destructive/20",
              className
            )}
          />
        }
      >
        <CalendarIcon />
        {selected ? (
          <span className="tabular-nums">{format(selected, "PP", { locale })}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder ?? translate("common.placeholders.pickADate")}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-0 p-0">
        <Calendar
          mode="single"
          locale={locale}
          captionLayout="dropdown"
          defaultMonth={selected ?? maxDate ?? minDate}
          startMonth={minDate ?? new Date(1950, 0)}
          endMonth={maxDate ?? addYears(now, 10)}
          disabled={
            minDate || maxDate
              ? [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]
              : undefined
          }
          selected={selected}
          onSelect={(d) => d && pick(format(d, ISO))}
        />
        {clearable && selected && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => pick("")}>
              {translate("buttons.clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
