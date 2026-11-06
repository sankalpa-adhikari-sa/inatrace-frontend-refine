import { useTranslate } from "@refinedev/core";
import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import type { ApiUserCustomer } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ep } from "@/lib/endpoints";
import { download, postFile, useApiMutation } from "@/lib/http";

/** Upload / export the farmer's plots as GeoJSON (saved farmers only). */
export function GeoDataActions({ farmer, onUploaded }: { farmer: ApiUserCustomer; onUploaded: () => void }) {
  const translate = useTranslate();
  const input = useRef<HTMLInputElement>(null);
  const upload = useApiMutation({
    mutationFn: (file: File) => postFile(`api/company/userCustomers/${farmer.id}/uploadGeoData`, file),
    onSuccess: onUploaded,
  });
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        onClick={() => input.current?.click()}
      >
        {upload.isPending ? <Spinner /> : <Upload />}
        {translate("userCustomers.plots.buttons.uploadGeoData")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          download(
            ep.exportUserCustomerGeoData,
            { path: { id: farmer.id! } },
            `${farmer.name}_${farmer.surname}_geo_data.json`
          )
        }
      >
        <Download />
        {translate("userCustomers.plots.buttons.exportGeoData")}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".json,.geojson,application/json,application/geo+json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
