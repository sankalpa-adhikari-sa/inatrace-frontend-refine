import { useTranslate } from "@refinedev/core";
import type { ApiPlot } from "@/client/types.gen";
import type { MapPoint } from "@/components/app/map-view";

export type PlotType = "boundaries" | "single_point";
export type Draft = { type: PlotType; points: MapPoint[]; editing?: number };

export const toCoordinate = (p: MapPoint) => ({ latitude: Number(p.lat.toFixed(6)), longitude: Number(p.lng.toFixed(6)) });
const toPoint = (c: { latitude?: number; longitude?: number }) => ({ lat: Number(c.latitude), lng: Number(c.longitude) });
export const plotPoints = (plot?: ApiPlot) => (plot?.coordinates ?? []).map(toPoint).filter((p) => !Number.isNaN(p.lat));

export function formatUpdated(value?: string) {
  if (!value) return "/";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function useEudrWarning() {
  const translate = useTranslate();
  return translate("userCustomers.plots.titles.europeanLegislationEudrRequiresPolygon").replace(/\s*Would you like to proceed anyways\?$/, "");
}
