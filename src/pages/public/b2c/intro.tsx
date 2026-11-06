import { useTranslate } from "@refinedev/core";
import { useNavigate } from "react-router";
import { documentUrl } from "@/lib/api";
import { useB2c } from "./context";

/** Index (B2cIntroComponent) */
export function B2cIntro() {
  const translate = useTranslate();
  const { settings, productName, uuid, qrTag, textFont, productFont } = useB2c();
  const navigate = useNavigate();
  const background = settings.landingPageBackgroundImage?.storageKey
    ? `url(${documentUrl(settings.landingPageBackgroundImage.storageKey, true)})`
    : undefined;
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-6 bg-cover bg-center px-4 py-16"
      style={{ backgroundColor: settings.tertiaryColor, backgroundImage: background }}
    >
      {settings.landingPageImage?.storageKey && (
        <img src={documentUrl(settings.landingPageImage.storageKey, true)} alt="" className="max-h-80 max-w-full" />
      )}
      <h2 className="text-center text-3xl font-semibold" style={{ ...productFont, color: settings.productTitleColor }}>
        {productName}
      </h2>
      <button
        type="button"
        onClick={() => navigate(`/p-cd/${uuid}/${qrTag}/journey`)}
        className="rounded px-12 py-3 text-sm font-semibold tracking-wider text-white uppercase"
        style={{ ...textFont, backgroundColor: settings.secondaryColor }}
      >
        {translate("b2c.buttons.productJourney")}
      </button>
    </div>
  );
}
