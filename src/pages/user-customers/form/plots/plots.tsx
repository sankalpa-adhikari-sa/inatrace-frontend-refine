import { useNotification, useTranslate } from "@refinedev/core";
import { Hexagon, MapPin, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Control, useFieldArray, useWatch } from "react-hook-form";
import type { ApiPlot, ApiProductType } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import type { MapPoint } from "@/components/app/map-view";
import { PlotsMap, WhispDialog, plotAreaHa } from "@/components/app/plots-map";
import { Button } from "@/components/ui/button";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { cn } from "@/lib/utils";
import type { FormValues } from "../model";
import { DrawPanel } from "./draw-panel";
import { EudrDialog } from "./eudr-dialog";
import { PlotCard } from "./plot-card";
import { type Draft, type PlotType, plotPoints, toCoordinate } from "./utils";

/**
 * The farmer's plots (plots-form + plots-item). A plot is drawn on the map as a boundary
 * (polygon) or a single point; the drawing panel sits under the map, points can be dragged,
 * and saved plots can be reshaped (the backend refreshes their GeoID on save).
 */
export function Plots({
  control,
  productTypes,
  farmerId,
}: {
  control: Control<FormValues>;
  productTypes: ApiProductType[];
  farmerId?: number;
}) {
  const translate = useTranslate();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const { fields, append, remove, update } = useFieldArray({ control, name: "plots", keyName: "key" });
  const plots = (useWatch({ control, name: "plots" }) ?? []) as ApiPlot[];
  const location = useWatch({ control, name: "location" });
  const pin =
    location?.latitude != null && location?.longitude != null
      ? { lat: Number(location.latitude), lng: Number(location.longitude) }
      : null;
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [whisp, setWhisp] = useState<string | null>(null);
  const [draft, setDraftState] = useState<Draft | null>(null);
  // The boundary corner chosen on the map (to remove it); cleared whenever the draft changes.
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const setDraft = (d: Draft | null) => {
    setDraftState(d);
    setSelectedPoint(null);
  };
  // Other plots can be hidden while drawing; the choice is kept for the next plot.
  const [showOthers, setShowOthers] = useState(true);
  const [focus, setFocus] = useState<{ key: number; points: MapPoint[] }>();
  // After adding a plot, its card is scrolled to and its name field focused.
  const [focusCard, setFocusCard] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const isPolygon = draft?.type === "boundaries";
  const canFinish = !!draft && (isPolygon ? draft.points.length >= 3 : draft.points.length === 1);
  const area = isPolygon && draft.points.length >= 3 ? plotAreaHa(draft.points) : null;

  // Registers the plot with AgStack and stores its GeoID (saved plots only).
  async function refreshGeoId(plot: ApiPlot) {
    const i = plots.findIndex((p) => p.id === plot.id);
    if (farmerId == null || plot.id == null || i < 0) return;
    setRefreshing(plot.id);
    try {
      const res = await call(ep.refreshGeoIDForUserCustomerPlot, { path: { id: farmerId, plotId: plot.id } });
      // Start from the live values so unsaved edits to this plot are kept.
      if (res?.geoId) update(i, { ...plots[i], geoId: res.geoId });
    } finally {
      setRefreshing(null);
    }
  }

  // EUDR advice before a single point (new or reshaped), until dismissed for this form.
  const [eudrPrompt, setEudrPrompt] = useState<{ editing?: number } | null>(null);
  const [eudrDismissed, setEudrDismissed] = useState(false);

  function start(type: PlotType, editing?: number) {
    if (type === "single_point" && !eudrDismissed) {
      setEudrPrompt({ editing });
      return;
    }
    begin(type, editing);
  }

  function begin(type: PlotType, editing?: number) {
    setDraft({ type, editing, points: editing != null ? plotPoints(plots[editing]) : [] });
    scrollToMap();
  }

  function scrollToMap() {
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function addPoint(p: MapPoint) {
    if (!draft) return;
    // A single point has one pin: clicking again moves it.
    setDraft({ ...draft, points: draft.type === "single_point" ? [p] : [...draft.points, p] });
  }

  function movePoint(index: number, p: MapPoint) {
    if (!draft) return;
    // Moving a corner keeps it selected.
    setDraftState({ ...draft, points: draft.points.map((x, i) => (i === index ? p : x)) });
  }

  function removePoint(index: number) {
    if (!draft) return;
    setDraft({ ...draft, points: draft.points.filter((_, i) => i !== index) });
  }

  function finish() {
    if (!draft || !canFinish) return;
    // New coordinates (no ids) replace the old ones; size only for a boundary.
    const shape = {
      coordinates: draft.points.map(toCoordinate),
      size: area != null ? Number(area.toFixed(2)) : undefined,
      unit: area != null ? "ha" : undefined,
    };
    if (draft.editing != null) {
      update(draft.editing, { ...plots[draft.editing], ...shape });
    } else {
      append(shape);
      setFocusCard(fields.length);
    }
    setDraft(null);
  }

  useEffect(() => {
    if (focusCard == null) return;
    const input = document.getElementById(`plots.${focusCard}.plotName`);
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
    setFocusCard(null);
  }, [focusCard, fields.length]);

  // Enter finishes, Escape cancels, Backspace undoes the last point (not while typing in a field).
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "Escape") setDraft(null);
      else if (e.key === "Enter" && canFinish) {
        e.preventDefault();
        finish();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedPoint != null) {
        e.preventDefault();
        removePoint(selectedPoint);
      } else if ((e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) && draft.points.length) {
        e.preventDefault();
        setDraft({ ...draft, points: draft.points.slice(0, -1) });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const plotLabel = (i: number) =>
    plots[i]?.plotName || translate("userCustomers.plots.texts.plot", { value: i + 1 });

  async function removePlot(i: number) {
    const name = plotLabel(i);
    if (
      !(await confirm({
        description: translate("userCustomers.plots.descriptions.deleteThePlot", { name }),
        destructive: true,
        confirmLabel: translate("userCustomers.plots.buttons.deletePlot"),
      }))
    )
      return;
    if (draft?.editing === i) setDraft(null);
    remove(i);
  }

  async function copyGeoId(geoId: string) {
    try {
      await navigator.clipboard.writeText(geoId);
      notify?.({ type: "success", message: translate("userCustomers.plots.notifications.geoIDCopied") });
    } catch {
      // Clipboard unavailable (e.g. insecure context); the GeoID is still selectable.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Start a plot in one click: its kind decides how the map is used. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {fields.length === 1
            ? translate("userCustomers.plots.texts.1Plot")
            : translate("userCustomers.plots.texts.plots", { fieldsCount: fields.length })}
        </span>
        <div className="ml-auto">
          <AddPlotButtons disabled={!!draft} onStart={start} />
        </div>
      </div>

      <div ref={mapRef} className={cn("flex flex-col gap-2 rounded-md", draft && "ring-2 ring-primary ring-offset-2")}>
        <PlotsMap
          className="h-[28rem]"
          plots={plots}
          pin={pin}
          draft={draft?.points}
          showDraftArea={isPolygon}
          onMapClick={draft ? addPoint : undefined}
          onDraftMove={draft ? movePoint : undefined}
          selectedDraftIndex={selectedPoint}
          onDraftSelect={isPolygon ? (i) => setSelectedPoint((cur) => (cur === i ? null : i)) : undefined}
          hideOthers={!!draft && !showOthers}
          hideIndex={draft?.editing}
          focus={focus}
          locateUser
          onRefreshGeoId={farmerId != null ? refreshGeoId : undefined}
          refreshingId={refreshing}
          onOpenWhisp={setWhisp}
        />
        {/* Under the map, so it never hides it (phones included). */}
        {draft && (
          <DrawPanel
            draft={draft}
            title={
              draft.editing != null
                ? translate("userCustomers.plots.titles.editingTheShapeOf", { editing: plotLabel(draft.editing) })
                : isPolygon
                  ? translate("userCustomers.plots.titles.newPlotBoundaries")
                  : translate("userCustomers.plots.titles.newPlotSinglePoint")
            }
            area={area}
            canFinish={canFinish}
            onUndo={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}
            selectedPoint={selectedPoint}
            onRemoveSelected={() => selectedPoint != null && removePoint(selectedPoint)}
            // Only offered when there are other plots to hide.
            othersCount={plots.length - (draft.editing != null ? 1 : 0)}
            showOthers={showOthers}
            onShowOthersChange={setShowOthers}
            onClear={() => setDraft({ ...draft, points: [] })}
            onCancel={() => setDraft(null)}
            onFinish={finish}
          />
        )}
      </div>

      {fields.map((f, i) => {
        const plot = plots[i];
        return (
          <PlotCard
            key={f.key}
            control={control}
            index={i}
            plot={plot}
            label={plotLabel(i)}
            productTypes={productTypes}
            canRefreshGeoId={farmerId != null}
            refreshing={plot?.id != null && refreshing === plot.id}
            editing={draft?.editing === i}
            drawing={!!draft}
            onOpenWhisp={setWhisp}
            onCopyGeoId={copyGeoId}
            onRefreshGeoId={() => plot && refreshGeoId(plot)}
            onShowOnMap={(points) => {
              setFocus({ key: Date.now(), points });
              scrollToMap();
            }}
            onEditShape={(type) => start(type, i)}
            onRemove={() => removePlot(i)}
          />
        );
      })}
      {!draft && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-dashed p-3 text-sm">
          <span className="flex items-center gap-2 font-medium text-muted-foreground">
            <Plus className="size-4" />
            {fields.length === 0 ? translate("userCustomers.plots.texts.addTheFirstPlot") : translate("userCustomers.plots.texts.addAnotherPlot")}
          </span>
          <AddPlotButtons onStart={start} />
        </div>
      )}
      {whisp && <WhispDialog geoId={whisp} onClose={() => setWhisp(null)} />}
      {eudrPrompt && (
        <EudrDialog
          onClose={() => setEudrPrompt(null)}
          onChoose={(type, dontShowAgain) => {
            if (dontShowAgain) setEudrDismissed(true);
            setEudrPrompt(null);
            begin(type, eudrPrompt.editing);
          }}
        />
      )}
    </div>
  );
}

function AddPlotButtons({ disabled, onStart }: { disabled?: boolean; onStart: (type: PlotType) => void }) {
  const translate = useTranslate();
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onStart("boundaries")}>
        <Hexagon />
        {translate("userCustomers.plots.buttons.boundaries")}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onStart("single_point")}>
        <MapPin />
        {translate("userCustomers.plots.buttons.singlePoint")}
      </Button>
    </div>
  );
}
