import { useTranslate } from "@refinedev/core";
import { Hexagon, Info, MapPin } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type PlotType, useEudrWarning } from "./utils";


export function EudrDialog({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (type: PlotType, dontShowAgain: boolean) => void;
}) {
  const translate = useTranslate();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const message = useEudrWarning();
  const options: {
    type: PlotType;
    icon: ReactNode;
    title: string;
    note: string;
    recommended?: boolean;
  }[] = [
    {
      type: "boundaries",
      icon: <Hexagon />,
      title: translate("userCustomers.plots.titles.boundaries"),
      note: translate("userCustomers.plots.errors.drawThePlotsOutlineRequired"),
      recommended: true,
    },
    {
      type: "single_point",
      icon: <MapPin />,
      title: translate("userCustomers.plots.titles.singlePoint"),
      note: translate("userCustomers.plots.texts.markThePlotWithOne"),
    },
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("userCustomers.plots.titles.singlePointOrBoundary")}</DialogTitle>
          <p className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-warning" />
            {message}
          </p>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.type}
              type="button"
              onClick={() => onChoose(o.type, dontShowAgain)}
              className={cn(
                "group flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                o.recommended
                  ? "border-primary bg-primary-lighter hover:bg-primary-light/60"
                  : "border-border hover:border-primary/60 hover:bg-accent"
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full [&_svg]:size-5",
                    o.recommended ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {o.icon}
                </span>
                {o.recommended && <Badge>{translate("userCustomers.plots.texts.recommended")}</Badge>}
              </span>
              <span className="text-sm font-medium">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.note}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={dontShowAgain} onCheckedChange={(c) => setDontShowAgain(!!c)} />
            {translate("userCustomers.plots.fields.dontShowThisAgainWhile")}
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
