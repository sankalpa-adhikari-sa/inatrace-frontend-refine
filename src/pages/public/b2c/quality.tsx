import { useTranslate } from "@refinedev/core";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { documentUrl } from "@/lib/api";
import { saveBlob } from "@/lib/download";
import { t } from "@/lib/i18n";
import { useB2c } from "./context";
import { B2cMain } from "./layout";

const CERT_TYPES: Record<string, string> = {
  get EU_ORGANIC() { return t("b2c.texts.euOrganic"); },
  get RAINFOREST_ALLIANCE() { return t("b2c.texts.rainforestAlliance"); },
  get CARBON_NEUTRAL() { return t("b2c.texts.carbonNeutral"); },
  get FAIRTRADE() { return t("b2c.texts.fairtrade"); },
};

/** Downloads a public document under its own name (works when the API is on another origin). */
async function downloadPublic(storageKey: string, name?: string) {
  const res = await fetch(documentUrl(storageKey, true)!);
  if (res.ok) saveBlob(await res.blob(), name || storageKey);
}

/** Renders a translated sentence with a marker placeholder replaced by `node`. */
function withNode(text: (marker: string) => string, node: ReactNode) {
  const marker = "\u0000";
  const [before, after = ""] = text(marker).split(marker);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

/** `quality` (B2cQualityComponent) */
export function B2cQuality() {
  const translate = useTranslate();
  const { settings, qr, productName } = useB2c();
  const grade = qr.cuppingScore;
  return (
    <B2cMain title={translate("b2c.titles.qualityAndCertificates")}>
      {settings.graphicQuality && (
        <>
          <QualityChart
            grade={grade}
            color={settings.primaryColor}
            label={translate("b2c.fields.80PointsSpecialtyCoffee")}
          />
          <p>
            {withNode(
              (marker) =>
                translate("b2c.fields.theGraphicShowsTheQuality", { marker }),
              <strong>{productName}</strong>
            )}
          </p>
        </>
      )}
      <h2 className="text-lg font-semibold">{translate("b2c.titles.flavorProfile")}</h2>
      <p>{qr.cuppingFlavour || "/"}</p>
      <h2 className="text-lg font-semibold">
        {translate("b2c.titles.roastingProfile")}
      </h2>
      <p>{qr.roastingProfile || "/"}</p>
      <h2 className="text-lg font-semibold">{translate("b2c.titles.certificates")}</h2>
      {qr.certificates?.length ? (
        qr.certificates.map((cert, i) => (
          <div key={cert.id ?? i} className="flex flex-col gap-1 rounded-lg border p-4">
            <h3 className="font-semibold">{CERT_TYPES[cert.type ?? ""] ?? "-"}</h3>
            {cert.validity && (
              <p className="text-xs text-neutral-500">
                {translate("b2c.texts.valid", { validity: cert.validity })}
              </p>
            )}
            {cert.description && <p>{cert.description}</p>}
            {cert.certificate?.storageKey && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => downloadPublic(cert.certificate!.storageKey!, cert.certificate!.name)}
              >
                <Download />
                {translate("b2c.buttons.download")}
              </Button>
            )}
          </div>
        ))
      ) : (
        <p>/</p>
      )}
    </B2cMain>
  );
}


function QualityChart({ grade, color, label }: { grade?: number; color?: string; label: string }) {
  const translate = useTranslate();
  const value = grade ? translate("b2c.texts.points", { grade }) : "/";
  return (
    <figure className="mx-auto my-4 flex w-60 items-end" role="img" aria-label={`${label}; ${value}`}>
      <span className="h-[100px] flex-1 self-end border-t border-neutral-400 pt-1 pr-1 text-[11px]/normal text-neutral-500">
        {label}
      </span>
      <span className="h-40 w-10 shrink-0 bg-[#ABABAB]" />
      <span
        className="w-32 shrink-0 pt-[10%] text-center text-base/tight font-semibold text-white tabular-nums"
        style={{ height: grade ? 2 * grade : 160, backgroundColor: color }}
      >
        {value}
      </span>
    </figure>
  );
}
