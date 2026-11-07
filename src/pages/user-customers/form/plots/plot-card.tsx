import { useTranslate } from "@refinedev/core";
import { Copy, Hexagon, LocateFixed, MapPin, PenLine, Trash2 } from "lucide-react";
import type { Control } from "react-hook-form";
import type { ApiPlot, ApiProductType } from "@/client/types.gen";
import { DateField, EntitySelectField, TextField } from "@/components/app/form-fields";
import type { MapPoint } from "@/components/app/map-view";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { FormValues } from "../model";
import { type PlotType, formatUpdated, plotPoints } from "./utils";

export function PlotCard({
  control,
  index: i,
  plot,
  label,
  productTypes,
  canRefreshGeoId,
  refreshing,
  editing,
  drawing,
  onOpenWhisp,
  onCopyGeoId,
  onRefreshGeoId,
  onShowOnMap,
  onEditShape,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  plot?: ApiPlot;
  label: string;
  productTypes: ApiProductType[];
  /** The farmer is saved, so a saved plot's GeoID can be refreshed. */
  canRefreshGeoId: boolean;
  refreshing: boolean;
  /** This plot's shape is being redrawn. */
  editing: boolean;
  /** Some plot shape is being drawn. */
  drawing: boolean;
  onOpenWhisp: (geoId: string) => void;
  onCopyGeoId: (geoId: string) => void;
  onRefreshGeoId: () => void;
  onShowOnMap: (points: MapPoint[]) => void;
  onEditShape: (type: PlotType) => void;
  onRemove: () => void;
}) {
  const translate = useTranslate();
  const points = plotPoints(plot);
  const polygon = points.length >= 3;
  return (
    <div className={cn("flex flex-col gap-3 rounded-md border p-3", editing && "border-primary")}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          {polygon ? <Hexagon className="size-3.5" /> : <MapPin className="size-3.5" />}
          {label}
          <span className="font-normal text-muted-foreground">
            ·{" "}
            {polygon
              ? translate("userCustomers.plots.texts.cornerPoints", { pointsCount: points.length })
              : points.length
                ? translate("userCustomers.plots.buttons.singlePoint")
                : translate("userCustomers.plots.texts.noCoordinates")}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>{translate("userCustomers.plots.titles.geoId")}</span>
          {plot?.geoId ? (
            <>
              <button type="button" className="font-mono underline" onClick={() => onOpenWhisp(plot.geoId!)}>
                {plot.geoId}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={translate("userCustomers.plots.buttons.copyGeoID")}
                onClick={() => onCopyGeoId(plot.geoId!)}
              >
                <Copy />
              </Button>
            </>
          ) : canRefreshGeoId && plot?.id != null && points.length ? (
            <Button type="button" variant="outline" size="xs" disabled={refreshing} onClick={onRefreshGeoId}>
              {refreshing && <Spinner />}
              {translate("userCustomers.plots.buttons.refreshGeoID")}
            </Button>
          ) : (
            <span>/</span>
          )}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          control={control}
          name={`plots.${i}.plotName`}
          label={translate("userCustomers.plots.fields.plotName")}
          placeholder={translate("userCustomers.plots.placeholders.enterPlotName")}
          rules={{ required: translate("userCustomers.plots.errors.plotNameIsRequired") }}
        />
        <EntitySelectField
          control={control}
          name={`plots.${i}.crop`}
          label={translate("userCustomers.plots.fields.crop")}
          items={productTypes}
          getLabel={(p) => p.name ?? ""}
          rules={{ required: translate("userCustomers.plots.errors.cropIsRequired") }}
        />
        <TextField
          control={control}
          name={`plots.${i}.numberOfPlants`}
          type="number"
          label={translate("userCustomers.plots.fields.numberOfPlants")}
          placeholder={translate("userCustomers.plots.placeholders.enterNumberOfPlants")}
        />
        {(polygon || plot?.size != null) && (
          <>
            <TextField
              control={control}
              name={`plots.${i}.size`}
              type="number"
              readOnly
              label={translate("userCustomers.plots.fields.size")}
            />
            <TextField
              control={control}
              name={`plots.${i}.unit`}
              readOnly
              label={translate("common.fields.unit")}
            />
          </>
        )}
        <DateField
          control={control}
          name={`plots.${i}.organicStartOfTransition`}
          label={translate("userCustomers.plots.fields.startedTransitionToOrganic")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="mr-auto">
          {translate("userCustomers.plots.fields.lastUpdate")} {formatUpdated(plot?.lastUpdated)}
        </span>
        <Button type="button" variant="ghost" size="sm" disabled={points.length === 0} onClick={() => onShowOnMap(points)}>
          <LocateFixed />
          {translate("userCustomers.plots.buttons.showOnMap")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={drawing}
          onClick={() => onEditShape(polygon ? "boundaries" : "single_point")}
        >
          <PenLine />
          {translate("userCustomers.plots.buttons.editShape")}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
          <Trash2 />
          {translate("userCustomers.plots.buttons.deletePlot")}
        </Button>
      </div>
    </div>
  );
}
