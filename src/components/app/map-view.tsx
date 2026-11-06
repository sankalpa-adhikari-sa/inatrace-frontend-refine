import { type ReactNode, Suspense, lazy } from "react";
import { cn } from "@/lib/utils";


export type MapPoint = { lat: number; lng: number };
export type MapMarker = MapPoint & {
  id: string | number;
  /** Short text inside the marker (e.g. an index or a count). */
  label?: string;
  color?: string;
  draggable?: boolean;
  onDragEnd?: (p: MapPoint) => void;
  /** Content of the popup opened by clicking the marker. */
  popup?: ReactNode;
  /** "pin" (default): a labelled pin; "dot": a small round handle centred on the point (shape corners). */
  shape?: "pin" | "dot";
  /** Called when the marker is clicked (not after dragging it). */
  onClick?: () => void;
  /** Emphasised, e.g. the corner chosen for removal. */
  selected?: boolean;
};
export type MapLine = { id: string; points: MapPoint[]; color?: string; dashed?: boolean };
export type MapPolygon = { id: string; points: MapPoint[]; color?: string };

export type MapViewProps = {
  markers?: MapMarker[];
  lines?: MapLine[];
  polygons?: MapPolygon[];
  onMapClick?: (p: MapPoint) => void;
  onPolygonClick?: (id: string) => void;
  /** Fit the camera to all shapes whenever this value changes. */
  fitKey?: unknown;
  /** Fly to these points whenever `key` changes (e.g. "show this plot"). */
  focus?: { key: unknown; points: MapPoint[] };
  center?: MapPoint;
  zoom?: number;
  className?: string;
  /** Controls drawn over the map. */
  children?: ReactNode;
  /** Start on satellite imagery when it is configured (plots). */
  satellite?: boolean;
  /**
   * Start at the user's position when there is nothing to show, and offer a "locate me" button.
   * Defaults to whether the map is editable (`onMapClick`).
   */
  locateUser?: boolean;
};

const MapViewImpl = lazy(() => import("./map-view-impl"));

export function MapView(props: MapViewProps) {
  return (
    <Suspense
      fallback={<div className={cn("h-80 w-full animate-pulse rounded-md border bg-muted", props.className)} />}
    >
      <MapViewImpl {...props} />
    </Suspense>
  );
}
