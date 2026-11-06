import { useTranslate } from "@refinedev/core";
import { Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

const QR_COLOR = "#4B382A";


export function UserCustomerCard({
  id,
  name,
  surname,
  village,
  cell,
  sector,
}: {
  id: number;
  name?: string;
  surname?: string;
  village?: string;
  cell?: string;
  sector?: string;
}) {
  const translate = useTranslate();
  const location = [village, cell, sector].filter(Boolean).join(", ");

  const print = () => {
    document.body.classList.add("printing-card");
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-card"), { once: true });
    window.print();
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-3">
      <div
        data-print-card
        className="flex min-h-[330px] w-[230px] flex-col items-center rounded border border-primary bg-white p-1 text-center text-neutral-900"
      >
        <img src="/logo-INA.png" alt="" className="w-12 pt-2" />
        <div className="pt-6 text-base font-bold">
          {name} {surname}
        </div>
        {location && <div className="pt-2 text-xs">{location}</div>}
        <div className="mt-7 rounded-[1px] border border-neutral-400">
          <QRCodeSVG value={String(id)} size={110} fgColor={QR_COLOR} />
        </div>
        <div className="flex-1" />
        <div className="text-[0.5rem] text-secondary">{env.appName}™</div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={print}>
        <Printer />
        {translate("buttons.printCard")}
      </Button>
    </div>
  );
}
