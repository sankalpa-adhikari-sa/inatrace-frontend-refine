import { format, isValid, parseISO, startOfYear, subDays, subMonths, subYears } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

const ISO = "yyyy-MM-dd";

/** Parses an ISO day; empty or malformed input gives undefined instead of an Invalid Date. */
function parseDay(value: string | undefined) {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

/**
 * Calendar range picker over ISO `yyyy-MM-dd` strings. The range is applied
 * once both ends are picked; presets apply immediately. With `clearable`, ""
 * on both ends means "any date".
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  max,
  className,
  clearable,
  placeholder,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Latest selectable day (ISO). */
  max?: string;
  className?: string;
  clearable?: boolean;
  placeholder?: string;
}) {
  const translate = useTranslate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const fromDate = parseDay(from);
  const toDate = parseDay(to);
  const maxDate = parseDay(max);
  const end = maxDate ?? new Date();

  const apply = (a: Date, b: Date) => {
    onChange(format(a, ISO), format(b, ISO));
    setOpen(false);
  };

  const presets: [string, Date][] = [
    [translate("common.texts.last30Days"), subDays(end, 29)],
    [translate("common.texts.last3Months"), subMonths(end, 3)],
    [translate("common.texts.last12Months"), subYears(end, 1)],
    [translate("common.texts.last2Years"), subYears(end, 2)],
    [translate("common.texts.thisYear"), startOfYear(end)],
  ];

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setDraft(o && fromDate ? { from: fromDate, to: toDate } : undefined);
      }}
    >
      <PopoverTrigger render={<Button variant="outline" className={cn("justify-start font-normal", className)} />}>
        <CalendarIcon />
        {fromDate || toDate ? (
          <span className="tabular-nums">
            {fromDate ? format(fromDate, "PP") : "…"} – {toDate ? format(toDate, "PP") : "…"}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder ?? translate("common.texts.anyDate")}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto flex-row gap-0 p-0">
        <div className="flex flex-col gap-0.5 p-2">
          {presets.map(([label, start]) => (
            <Button
              key={label}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => apply(start, end)}
            >
              {label}
            </Button>
          ))}
          {clearable && (from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-auto justify-start text-muted-foreground"
              onClick={() => {
                onChange("", "");
                setOpen(false);
              }}
            >
              {translate("buttons.clear")}
            </Button>
          )}
        </div>
        <Separator orientation="vertical" className="h-auto" />
        <Calendar
          mode="range"
          numberOfMonths={2}
          resetOnSelect
          captionLayout="dropdown"
          defaultMonth={subMonths(toDate ?? end, 1)}
          startMonth={subYears(end, 20)}
          endMonth={end}
          disabled={maxDate ? { after: maxDate } : undefined}
          selected={draft}
          onSelect={(range) => {
            setDraft(range);
            // With resetOnSelect the first click yields { from, to: undefined }.
            if (range?.from && range.to) apply(range.from, range.to);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
