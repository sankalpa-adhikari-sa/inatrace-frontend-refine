import maplibregl, { type LngLatLike, type Map as MlMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import type { MapLine, MapMarker, MapPoint, MapPolygon, MapViewProps } from "./map-view";
import { cn } from "@/lib/utils";

type Basemap = "map" | "satellite";

function style(basemap: Basemap): StyleSpecification {
  const satellite = basemap === "satellite" && !!env.mapSatelliteTiles;
  // Imagery alone has no place names; some providers serve them as a separate layer.
  const labels = satellite && env.mapSatelliteLabels;
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [satellite ? env.mapSatelliteTiles : env.mapTiles],
        tileSize: 256,
        maxzoom: 19,
        attribution: satellite ? env.mapSatelliteAttribution : env.mapAttribution,
      },
      ...(labels ? { labels: { type: "raster" as const, tiles: [labels], tileSize: 256, maxzoom: 19 } } : {}),
    },
    layers: [
      { id: "base", type: "raster", source: "base" },
      ...(labels ? [{ id: "labels", type: "raster" as const, source: "labels" }] : []),
    ],
  };
}

const DEFAULT_CENTER: MapPoint = { lat: 5.27, lng: 21.51 };
const valid = (p: Partial<MapPoint>): p is MapPoint =>
  typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng);
const lngLat = (p: MapPoint): [number, number] => [p.lng, p.lat];

/** Loaded lazily through ./map-view so MapLibre stays out of the main bundle. */
/** MapLibre's built-in control labels and gesture hints, in the UI language. */
const mapLocale = () => ({
  "NavigationControl.ZoomIn": t("common.map.zoomIn"),
  "NavigationControl.ZoomOut": t("common.map.zoomOut"),
  "GeolocateControl.FindMyLocation": t("common.map.findMyLocation"),
  "GeolocateControl.LocationNotAvailable": t("common.map.locationNotAvailable"),
  "AttributionControl.ToggleAttribution": t("common.map.toggleAttribution"),
  "Map.Title": t("common.map.mapTitle"),
  "Marker.Title": t("common.map.marker"),
  "Popup.Close": t("common.map.closePopup"),
  "CooperativeGesturesHandler.WindowsHelpText": t("common.map.ctrlScrollToZoom"),
  "CooperativeGesturesHandler.MacHelpText": t("common.map.cmdScrollToZoom"),
  "CooperativeGesturesHandler.MobileHelpText": t("common.map.twoFingersToMove"),
});

export default function MapView({
  markers = [],
  lines = [],
  polygons = [],
  onMapClick,
  onPolygonClick,
  fitKey,
  focus,
  center,
  zoom = 2,
  className,
  children,
  satellite = false,
  locateUser,
}: MapViewProps) {
  const canLocate = (locateUser ?? !!onMapClick) && typeof navigator !== "undefined" && "geolocation" in navigator;
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MlMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>(satellite && env.mapSatelliteTiles ? "satellite" : "map");
  const handlers = useRef({ onMapClick, onPolygonClick });
  handlers.current = { onMapClick, onPolygonClick };
  // Whether there's anything to show; read when the browser's position arrives.
  const hasData = () =>
    markers.some(valid) || lines.some((l) => l.points.some(valid)) || polygons.some((pg) => pg.points.some(valid));
  const hasDataRef = useRef(hasData);
  hasDataRef.current = hasData;

  useEffect(() => {
    const start = center && valid(center) ? center : DEFAULT_CENTER;
    const m = new maplibregl.Map({
      container: container.current!,
      style: style(basemap),
      center: lngLat(start),
      zoom: center && valid(center) ? Math.max(zoom, 10) : zoom,
      cooperativeGestures: true,
      dragRotate: false,
      attributionControl: { compact: true },
      locale: mapLocale(),
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Editable maps can be recentred on the user's position.
    if (canLocate) {
      m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");
    }
    m.on("click", (e) => {
      // Marker clicks open their popup (MapLibre handles that); polygons have their own handler.
      if ((e.originalEvent.target as Element | null)?.closest?.(".maplibregl-marker")) return;
      const hit = m.queryRenderedFeatures(e.point, { layers: m.getLayer("polygons-fill") ? ["polygons-fill"] : [] });
      if (hit.length && handlers.current.onPolygonClick)
        return handlers.current.onPolygonClick(String(hit[0].properties.id));
      handlers.current.onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    m.on("load", () => setLoaded(true));
    setMap(m);
    return () => {
      m.remove();
      setMap(null);
      setLoaded(false);
    };
    // The map is created once; props are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const locate = useRef(canLocate && !(center && valid(center)) && !hasData());
  useEffect(() => {
    if (!map || !locate.current) return;
    locate.current = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (hasDataRef.current()) return;
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 13 });
      },
      () => {
        // Denied or unavailable: keep the default view.
      },
      { timeout: 10_000, maximumAge: 10 * 60_000 }
    );
  }, [map]);

  // Basemap switch keeps the data layers by re-adding them on style load.
  const [styleVersion, setStyleVersion] = useState(0);
  useEffect(() => {
    if (!map || !loaded) return;
    map.setStyle(style(basemap));
    map.once("styledata", () => setStyleVersion((v) => v + 1));
  }, [map, loaded, basemap]);

  // Lines and polygons as GeoJSON layers.
  useEffect(() => {
    if (!map || !loaded) return;
    const apply = () => {
      const lineData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: lines
          .filter((l) => l.points.filter(valid).length > 1)
          .map((l) => ({
            type: "Feature",
            properties: { id: l.id, color: l.color ?? "#25265E", dashed: !!l.dashed },
            geometry: { type: "LineString", coordinates: l.points.filter(valid).map(lngLat) },
          })),
      };
      const polygonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: polygons
          .filter((p) => p.points.filter(valid).length > 2)
          .map((p) => {
            const ring = p.points.filter(valid).map(lngLat);
            return {
              type: "Feature",
              properties: { id: p.id, color: p.color ?? "#f59e0b" },
              geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
            };
          }),
      };
      const upsert = (id: string, data: GeoJSON.FeatureCollection) => {
        const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(data);
        else map.addSource(id, { type: "geojson", data });
      };
      upsert("lines", lineData);
      upsert("polygons", polygonData);
      if (!map.getLayer("polygons-fill")) {
        map.addLayer({
          id: "polygons-fill",
          type: "fill",
          source: "polygons",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: "polygons-line",
          type: "line",
          source: "polygons",
          paint: { "line-color": ["get", "color"], "line-width": 2 },
        });
      }
      if (!map.getLayer("lines-solid")) {
        map.addLayer({
          id: "lines-solid",
          type: "line",
          source: "lines",
          filter: ["!", ["get", "dashed"]],
          paint: { "line-color": ["get", "color"], "line-width": 2 },
        });
        map.addLayer({
          id: "lines-dashed",
          type: "line",
          source: "lines",
          filter: ["get", "dashed"],
          paint: { "line-color": ["get", "color"], "line-width": 2, "line-dasharray": [2, 2] },
        });
      }
    };
    // Once the layers exist they can be updated straight away, even while tiles are still
    // loading (isStyleLoaded is false then), so shapes follow a dragged corner live.
    if (map.getSource("polygons") || map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [map, loaded, lines, polygons, styleVersion]);

  // Fly to one shape when asked.
  useEffect(() => {
    if (!map || !focus) return;
    const points = focus.points.filter(valid);
    if (points.length === 0) return;
    const bounds = new maplibregl.LngLatBounds(lngLat(points[0]), lngLat(points[0]));
    for (const p of points) bounds.extend(lngLat(p));
    map.fitBounds(bounds, { padding: 64, maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.key]);

  // Fit to the data when asked.
  useEffect(() => {
    if (!map || fitKey === undefined) return;
    const points = [...markers, ...lines.flatMap((l) => l.points), ...polygons.flatMap((p) => p.points)].filter(valid);
    if (points.length === 0) return;
    const bounds = new maplibregl.LngLatBounds(lngLat(points[0]), lngLat(points[0]));
    for (const p of points) bounds.extend(lngLat(p));
    map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  return (
    <div className={cn("relative h-80 w-full overflow-hidden rounded-md border", className)}>
      {/* MapLibre makes its container position: relative, so size it explicitly. */}
      <div ref={container} className="size-full" />
      {map && markers.filter(valid).map((m) => <Marker key={m.id} map={map} marker={m} />)}
      <div className="pointer-events-none absolute top-2 left-2 z-10 flex flex-wrap items-start gap-1 [&>*]:pointer-events-auto">
        {env.mapSatelliteTiles && (
          <div className="flex overflow-hidden rounded-md border bg-background text-[0.7rem] shadow-sm">
            {(["map", "satellite"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasemap(b)}
                className={cn("px-2 py-1", basemap === b ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {b === "map" ? t("buttons.map") : t("buttons.satellite")}
              </button>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Marker({ map, marker }: { map: MlMap; marker: MapMarker }) {
  const [el] = useState(() => document.createElement("div"));
  const [popupEl] = useState(() => document.createElement("div"));
  const latest = useRef(marker);
  latest.current = marker;
  const instance = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const m = new maplibregl.Marker({
      element: el,
      draggable: !!marker.draggable,
      anchor: marker.shape === "dot" || marker.shape === "midpoint" ? "center" : "bottom",
    })
      .setLngLat(lngLat(latest.current) as LngLatLike)
      .addTo(map);
    instance.current = m;
    // A drag ends with a click on the element; only a click without dragging counts.
    let dragged = false;
    // Live drag positions are reported at most once per animation frame.
    let frame = 0;
    m.on("dragstart", () => {
      dragged = true;
    });
    m.on("drag", () => {
      if (!latest.current.onDrag || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = m.getLngLat();
        latest.current.onDrag?.({ lat: p.lat, lng: p.lng });
      });
    });
    m.on("dragend", () => {
      // A pending live update must not land after the drop.
      cancelAnimationFrame(frame);
      frame = 0;
      const p = m.getLngLat();
      latest.current.onDragEnd?.({ lat: p.lat, lng: p.lng });
    });
    const onClick = (e: MouseEvent) => {
      if (dragged) {
        dragged = false;
        return;
      }
      if (latest.current.onClick) {
        e.stopPropagation();
        latest.current.onClick();
      }
    };
    el.addEventListener("click", onClick);
    if (marker.popup) m.setPopup(new maplibregl.Popup({ offset: 28, maxWidth: "280px" }).setDOMContent(popupEl));
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("click", onClick);
      m.remove();
      instance.current = null;
    };
    // Recreated only when draggability / popup presence / shape change; moving it doesn't
    // recreate it, so a drag in progress isn't interrupted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, marker.draggable, !!marker.popup, marker.shape]);

  useEffect(() => {
    instance.current?.setLngLat([marker.lng, marker.lat]);
  }, [marker.lat, marker.lng]);

  return (
    <>
      {createPortal(
        marker.shape === "midpoint" ? (
          // Between two corners: fainter and smaller than a corner, with the same touch area.
          <div className="group flex size-6 cursor-grab items-center justify-center active:cursor-grabbing" title={marker.label}>
            <div
              className="size-2.5 rounded-full border-2 bg-white/90 opacity-80 shadow-[0_0_0_1px_rgb(0_0_0/0.2)] transition-transform group-hover:scale-125 group-hover:opacity-100"
              style={{ borderColor: marker.color ?? "#25265E" }}
            />
          </div>
        ) : marker.shape === "dot" ? (
          // A shape corner: a round handle on the point, with a larger touch area around it.
          <div
            className={cn("flex size-6 items-center justify-center", marker.draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer")}
            title={marker.label}
          >
            <div
              className={cn(
                "rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)] transition-[width,height]",
                marker.selected ? "size-5 ring-3 ring-destructive/60" : "size-3.5"
              )}
              style={{ backgroundColor: marker.selected ? "var(--destructive)" : (marker.color ?? "#25265E") }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div
              className="flex min-w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white px-1.5 py-0.5 text-[0.65rem] font-semibold text-white shadow"
              style={{ backgroundColor: marker.color ?? "#25265E" }}
            >
              {marker.label ?? "\u00a0"}
            </div>
            <div className="h-2 w-0.5" style={{ backgroundColor: marker.color ?? "#25265E" }} />
          </div>
        ),
        el
      )}
      {marker.popup && createPortal(<div className="text-xs text-neutral-900">{marker.popup}</div>, popupEl)}
    </>
  );
}
