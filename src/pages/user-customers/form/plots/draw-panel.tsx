import { useTranslate } from "@refinedev/core";
import { Check, Eraser, Hexagon, Info, MapPin, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Draft, useEudrWarning } from "./utils";

/** The drawing controls, shown under the map while a plot shape is drawn. */
export function DrawPanel({
  draft,
  title,
  area,
  canFinish,
  onUndo,
  selectedPoint,
  onRemoveSelected,
  othersCount,
  showOthers,
  onShowOthersChange,
  onClear,
  onCancel,
  onFinish,
}: {
  draft: Draft;
  title: string;
  area: number | null;
  canFinish: boolean;
  onUndo: () => void;
  selectedPoint: number | null;
  onRemoveSelected: () => void;
  othersCount: number;
  showOthers: boolean;
  onShowOthersChange: (show: boolean) => void;
  onClear: () => void;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const translate = useTranslate();
  const eudrWarning = useEudrWarning();
  const polygon = draft.type === "boundaries";
  const n = draft.points.length;
  const hint = polygon
    ? n < 3
      ? translate("userCustomers.plots.descriptions.clickTheMapToAdd", { value: n })
      : translate("userCustomers.plots.descriptions.addMoreCornersDragA")
    : n === 0
      ? translate("userCustomers.plots.descriptions.clickTheMapToPlace")
      : translate("userCustomers.plots.descriptions.dragThePinOrClick");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {polygon ? <Hexagon className="size-3.5" /> : <MapPin className="size-3.5" />}
          {title}
          {!polygon && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="EUDR">
                    <Info className="size-3.5" />
                  </button>
                }
              />
              <TooltipContent className="max-w-64">{eudrWarning}</TooltipContent>
            </Tooltip>
          )}
        </p>
        <p className="text-muted-foreground">
          {hint}
          {area != null && (
            <>
              {" · "}
              {translate("userCustomers.plots.fields.size")}:{" "}
              <span className="font-medium text-foreground">{area.toFixed(2)} ha</span>
            </>
          )}
        </p>
        <p className="hidden text-[0.65rem] text-muted-foreground sm:block">
          {translate("userCustomers.plots.texts.enterFinishEscCancelBackspace")}
        </p>
        {othersCount > 0 && (
          <label className="mt-1 flex w-fit cursor-pointer items-center gap-2">
            <Switch checked={showOthers} onCheckedChange={onShowOthersChange} size="sm" />
            {translate("userCustomers.plots.fields.showOtherPlots", { othersCount })}
          </label>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {polygon && selectedPoint != null && (
          <Button type="button" size="sm" variant="destructive" onClick={onRemoveSelected}>
            <Trash2 />
            {translate("userCustomers.plots.buttons.removePoint", { selectedPoint: selectedPoint + 1 })}
          </Button>
        )}
        {polygon && (
          <Button type="button" size="sm" variant="ghost" disabled={n === 0} onClick={onUndo}>
            <Undo2 />
            <span className="hidden sm:inline">{translate("userCustomers.plots.texts.undoLastPoint")}</span>
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" disabled={n === 0} onClick={onClear}>
          <Eraser />
          <span className="hidden sm:inline">{translate("userCustomers.plots.texts.clear")}</span>
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {translate("buttons.cancel")}
        </Button>
        <Button type="button" size="sm" disabled={!canFinish} onClick={onFinish}>
          <Check />
          {draft.editing != null ? translate("userCustomers.plots.buttons.saveShape") : translate("userCustomers.plots.buttons.addPlot")}
        </Button>
      </div>
    </div>
  );
}
