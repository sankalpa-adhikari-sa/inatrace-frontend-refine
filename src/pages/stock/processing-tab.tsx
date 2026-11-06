import { ChevronDown, Cog, Home, Package, Sprout, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import type { ApiFacility, ApiProcessingAction } from "@/client/types.gen";
import { PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useSelectedCompany } from "@/hooks/use-session";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";

// Facilities are grouped by processing stage, as in StockProcessingFacilityListComponent.
const STAGES: { codes: string[]; icon: ReactNode }[] = [
  { codes: ["WASHING_STATION", "DRYING_BED", "BENEFICIO_HUMEDO"], icon: <Sprout /> },
  { codes: ["STORAGE", "ALMACEN"], icon: <Warehouse /> },
  { codes: ["HULLING_STATION", "MAQUILADO_CAFE", "BENEFICIO_SECO"], icon: <Cog /> },
  { codes: ["GREEN_COFFEE_STORAGE", "ALMACEN_CAFE_ORO"], icon: <Home /> },
];
const OTHER_ICON = <Package />;

function stageOf(f: ApiFacility) {
  const i = STAGES.findIndex((s) => s.codes.includes(f.facilityType?.code ?? ""));
  return i === -1 ? STAGES.length : i;
}

function whereIsIt(f: ApiFacility) {
  const a = f.facilityLocation?.address;
  if (!a) return "";
  if (a.country?.code === "RW") return a.village;
  if (a.country?.code === "HN") return a.hondurasVillage;
  return a.city;
}

/** Processing actions that can start at this facility (FacilityCardComponent.setMenuOptions). */
function actionsFor(f: ApiFacility, actions: ApiProcessingAction[]) {
  return actions.filter((a) => {
    if (a.type === "SHIPMENT") return false;
    if (a.supportedFacilities?.length && !a.supportedFacilities.some((s) => s.id === f.id)) return false;
    return (
      f.facilitySemiProductList?.some((s) => s.id === a.inputSemiProduct?.id) ||
      f.facilityFinalProducts?.some((p) => p.id === a.inputFinalProduct?.id)
    );
  });
}

/** `/my-stock/processing` */
export function ProcessingTab() {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const query = { };

  const { data: actions = [], isLoading: actionsLoading } = useApi(
    ep.listProcessingActionsByCompany,
    { path: { id: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );
  const { data: facilities = [], isLoading } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId ?? 0 }, query },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );

  if (companyId == null || isLoading || actionsLoading) return <PageLoader />;

  const sorted = [...facilities].sort((a, b) => stageOf(a) - stageOf(b));

  return (
    <Section plain
      title={translate("stock.titles.processing")}
      onboarding="stock-processing"
      description={translate("stock.descriptions.facilitiesTotal", { facilitiesCount: facilities.length })}
    >
      {sorted.length === 0 ? (
        <Empty className="border" data-onboarding="processing-facilities">
          <EmptyHeader>
            <EmptyTitle>
              {translate("stock.titles.noFacilities")}
            </EmptyTitle>
            <EmptyDescription>
              {translate("stock.descriptions.addFacilitiesUnderCompanySettings")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-onboarding="processing-facilities">
          {sorted.map((f) => {
            const options = actionsFor(f, actions);
            const contents = [
              ...(f.facilitySemiProductList ?? []).map((s) => s.name),
              ...(f.facilityFinalProducts ?? []).map((p) => `${p.name} (${p.product?.name ?? ""})`),
            ].join(", ");
            return (
              <div key={f.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
                    {STAGES[stageOf(f)]?.icon ?? OTHER_ICON}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{whereIsIt(f)}</span>
                  </div>
                </div>
                <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">
                  {contents || translate("stock.texts.noProducts")}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm" className="self-start" disabled={options.length === 0} />
                    }
                  >
                    {options.length ? translate("stock.texts.startProcessing") : translate("stock.texts.noProcessingActions")}
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  {/* Wider than the trigger button, so action names have room. */}
                  <DropdownMenuContent align="start" className="w-auto min-w-64 max-w-sm p-1.5">
                    {/* Base UI requires a group label to sit inside a group. */}
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="px-2.5 pt-1.5 pb-2">
                        {translate("stock.titles.processingActions")}
                      </DropdownMenuLabel>
                      {options.map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          className="min-h-9 px-2.5 py-2 text-sm"
                          onClick={() => navigate(`/my-stock/processing/${a.id}/facility/${f.id}/new`)}
                        >
                          {a.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
