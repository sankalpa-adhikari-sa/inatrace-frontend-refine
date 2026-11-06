import type { ReactNode } from "react";
import type { ApiPlot } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { type MapMarker, type MapPoint, MapView } from "./map-view";
import { useTranslate } from "@refinedev/core";

const PLOT_COLOR = "#f59e0b";
const DRAFT_COLOR = "#2a78d6";

const pointsOf = (plot: ApiPlot): MapPoint[] =>
  (plot.coordinates ?? [])
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({ lat: c.latitude!, lng: c.longitude! }));

const EARTH_RADIUS = 6378137;
const rad = (d: number) => (d * Math.PI) / 180;


export function plotAreaHa(points: MapPoint[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const lower = points[i];
    const middle = points[(i + 1) % points.length];
    const upper = points[(i + 2) % points.length];
    total += (rad(upper.lng) - rad(lower.lng)) * Math.sin(rad(middle.lat));
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2) / 10_000;
}

function centroid(points: MapPoint[]): MapPoint | null {
  if (points.length === 0) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

/**
 * Farmer plots as polygons with an info marker each (MapComponent): crop, size,
 * GeoID (refresh / open in Whisp) and certification. While `draft` is set the
 * map is in drawing mode and clicks add corner points.
 */
export function PlotsMap({
  plots,
  pin,
  draft,
  showDraftArea = true,
  onMapClick,
  onDraftMove,
  selectedDraftIndex,
  onDraftSelect,
  hideOthers,
  hideIndex,
  focus,
  locateUser,
  onRefreshGeoId,
  refreshingId,
  onOpenWhisp,
  className,
  children,
}: {
  plots: ApiPlot[];
  /** The farmer's location. */
  pin?: MapPoint | null;
  draft?: MapPoint[] | null;
  /** Fill / outline the drawn points ("Show/hide plot area"). */
  showDraftArea?: boolean;
  onMapClick?: (p: MapPoint) => void;
  /** Makes the draft points draggable; called with the moved point's index. */
  onDraftMove?: (index: number, p: MapPoint) => void;
  /** The draft corner chosen (e.g. to remove it), and the handler that chooses one. */
  selectedDraftIndex?: number | null;
  onDraftSelect?: (index: number) => void;
  /** Draw only the draft, not the farmer's other plots. */
  hideOthers?: boolean;
  /** A plot not to draw (the one being reshaped as the draft). */
  hideIndex?: number;
  /** See MapView: fly to these points when the key changes. */
  focus?: { key: unknown; points: MapPoint[] };
  /** See MapView: start at the user's position when there are no plots yet. */
  locateUser?: boolean;
  onRefreshGeoId?: (plot: ApiPlot) => void;
  refreshingId?: number | null;
  onOpenWhisp?: (geoId: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const translate = useTranslate();
  const markers: MapMarker[] = [];
  const shown = (i: number) => i !== hideIndex && !hideOthers;
  plots.forEach((plot, i) => {
    if (!shown(i)) return;
    const center = centroid(pointsOf(plot));
    if (!center) return;
    markers.push({
      id: `plot-${plot.id ?? i}`,
      ...center,
      color: PLOT_COLOR,
      label: String(i + 1),
      popup: (
        <div className="flex min-w-44 flex-col gap-1">
          <p className="font-semibold">
            {plot.plotName || translate("common.texts.plot", { value: i + 1 })}
          </p>
          <Row label={translate("common.fields.crop")}>{plot.crop?.name ?? "/"}</Row>
          <Row label={translate("common.fields.size")}>
            {plot.size != null ? `${plot.size} ${plot.unit ?? ""}` : "/"}
          </Row>
          <Row label={translate("common.fields.geoId")}>
            {plot.geoId ? (
              <button type="button" className="font-mono underline" onClick={() => onOpenWhisp?.(plot.geoId!)}>
                {plot.geoId}
              </button>
            ) : onRefreshGeoId && plot.id != null ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={refreshingId === plot.id}
                onClick={() => onRefreshGeoId(plot)}
              >
                {refreshingId === plot.id && <Spinner />}
                {translate("buttons.refresh")}
              </Button>
            ) : (
              "/"
            )}
          </Row>
          <Row label={translate("common.fields.certification")}>
            {plot.organicStartOfTransition
              ? translate("common.texts.euOrganic")
              : "/"}
          </Row>
        </div>
      ),
    });
  });
  if (pin) markers.push({ id: "farmer", ...pin, color: "#25265E" });
  draft?.forEach((p, i) =>
    markers.push({
      id: `draft-${i}`,
      ...p,
      color: DRAFT_COLOR,
      label: String(i + 1),
      // Boundary corners are small handles; a single point keeps its pin.
      shape: showDraftArea ? "dot" : "pin",
      selected: i === selectedDraftIndex,
      onClick: onDraftSelect ? () => onDraftSelect(i) : undefined,
      draggable: !!onDraftMove,
      onDragEnd: onDraftMove ? (to) => onDraftMove(i, to) : undefined,
    })
  );

  const polygons = [
    ...plots
      .map((plot, i) => ({ id: `plot-${plot.id ?? i}`, points: pointsOf(plot), color: PLOT_COLOR }))
      .filter((_, i) => shown(i)),
    ...(showDraftArea && draft && draft.length > 2 ? [{ id: "draft", points: draft, color: DRAFT_COLOR }] : []),
  ];
  const lines =
    showDraftArea && draft && draft.length === 2 ? [{ id: "draft-line", points: draft, color: DRAFT_COLOR }] : [];

  return (
    <MapView
      className={className}
      markers={markers}
      polygons={polygons}
      lines={lines}
      onMapClick={onMapClick}
      focus={focus}
      locateUser={locateUser}
      fitKey={plots.length}
      center={pin ?? undefined}
    >
      {children}
    </MapView>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

// Whisp (deforestation risk) view of a registered plot, as in OpenPlotDetailsExternallyModalComponent.
const WHISP_LAYERS = encodeURIComponent(
  JSON.stringify({ CocoaETH: { opacity: 1 }, JRCForestMask: { opacity: 1 }, OilPalmFDAP: { opacity: 1 } })
);
const WHISP_MAP = encodeURIComponent(JSON.stringify({ zoom: 15, mapType: "satellite" }));
const WHISP_SCRIPTS = encodeURIComponent(
  JSON.stringify({
    WhispSummary: {
      dateRange: [null, null],
      threshold: null,
      extraThreshold: null,
      multiCriteriaOption: null,
      multiCriteriaOptionClass: null,
    },
  })
);

export function WhispDialog({ geoId, onClose }: { geoId: string; onClose: () => void }) {
  const translate = useTranslate();
  const src = `https://whisp.earthmap.org/?aoi=WHISP&boundary&geoId=${encodeURIComponent(
    geoId
  )}&layers=${WHISP_LAYERS}&map=${WHISP_MAP}&scripts=${WHISP_SCRIPTS}&statisticsOpen=true`;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {translate("common.titles.whisp2", { geoId })}
          </DialogTitle>
        </DialogHeader>
        <iframe
          src={src}
          title={translate("common.titles.whisp", { geoId })}
          className="h-[70svh] w-full rounded border"
        />
      </DialogContent>
    </Dialog>
  );
}
