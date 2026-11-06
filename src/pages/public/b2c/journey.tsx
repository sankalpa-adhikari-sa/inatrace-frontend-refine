import { useTranslate } from "@refinedev/core";
import { CircleDot, Leaf, QrCode, Ship, Warehouse } from "lucide-react";
import type { ApiHistoryTimelineItem } from "@/client/types.gen";
import { MapView } from "@/components/app/map-view";
import { useB2c } from "./context";
import { B2cMain } from "./layout";

const ICONS: Record<string, typeof Leaf> = {
  SHIP: Ship,
  LEAF: Leaf,
  WAREHOUSE: Warehouse,
  QRCODE: QrCode,
  OTHER: CircleDot,
};
const iconFor = (item: ApiHistoryTimelineItem) =>
  (item.iconType ? ICONS[item.iconType] : item.type === "TRANSFER" ? Ship : Leaf) ?? Leaf;

/** `yyyy-mm-dd` → `dd.mm.yyyy`; today when empty (the "Your scan" entry). */
function formatDate(date?: string) {
  if (date) {
    const [y, m, d] = date.slice(0, 10).split("-");
    return `${d}.${m}.${y}`;
  }
  const t = new Date();
  return `${t.getDate()}.${t.getMonth() + 1}.${t.getFullYear()}`;
}

/** `journey` (B2cJourneyComponent): route map and the history timeline. */
export function B2cJourney() {
  const translate = useTranslate();
  const { settings, qr, field, qrTag } = useB2c();
  const items = qrTag !== "EMPTY" ? (qr.historyTimeline?.items ?? []).filter((i) => i.type) : [];
  const route = (field<{ latitude?: number; longitude?: number }[]>("journeyMarkers") ?? []).map((m) => ({
    lat: Number(m.latitude),
    lng: Number(m.longitude),
  }));
  const markers = [
    ...route.filter((_, i) => i % 2 === 0).map((p, i) => ({ id: `route-${i}`, ...p, color: settings.primaryColor })),
    ...items
      .filter((i) => i.latitude != null && i.longitude != null)
      .map((i, n) => ({
        id: `step-${n}`,
        lat: i.latitude!,
        lng: i.longitude!,
        color: settings.primaryColor,
        popup: i.name,
      })),
  ];
  const producer = (qrTag !== "EMPTY" && qr.producerName) || field<string>("name") || "";
  const dot = (Icon: typeof Leaf) => (
    <span
      className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: settings.primaryColor }}
    >
      <Icon className="size-5" />
    </span>
  );
  return (
    <B2cMain title={translate("b2c.titles.productJourney")}>
      {(route.length > 0 || markers.length > 0) && (
        <MapView
          fitKey={route.length + markers.length}
          lines={[{ id: "route", points: route, dashed: true, color: settings.primaryColor }]}
          markers={markers}
        />
      )}
      <ol className="relative flex flex-col gap-6 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:bg-neutral-300">
        <li className="flex items-center gap-4">
          {dot(QrCode)}
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500">{formatDate()}</span>
            <span className="font-medium">{translate("b2c.texts.yourScan")}</span>
          </div>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-4">
            {dot(iconFor(item))}
            <div className="flex flex-col">
              <span className="text-xs text-neutral-500">{formatDate(item.date)}</span>
              <span className="font-medium">
                {item.name}
                {item.step && item.steps ? ` (${item.step}/${item.steps})` : ""}
              </span>
              {item.location && <span className="text-xs text-neutral-500">{item.location}</span>}
            </div>
          </li>
        ))}
        {items.length > 0 && (
          <li className="flex items-center gap-4">
            {dot(Leaf)}
            <div className="flex flex-col">
              <span className="font-medium">{translate("b2c.texts.harvesting")}</span>
              <span className="text-xs text-neutral-500">
                {translate("b2c.texts.farmersFrom", { producer })}
              </span>
            </div>
          </li>
        )}
      </ol>
    </B2cMain>
  );
}
