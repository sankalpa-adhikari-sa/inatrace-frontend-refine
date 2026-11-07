import { PageHeader, PageLoader } from "@/components/app/page";
import { useSelectedCompany } from "@/hooks/use-session";
import { useTranslate } from "@refinedev/core";
import { RangeControls, useDashboardRange } from "./controls";
import { DeliveriesPanel } from "./deliveries-panel";
import { PerformancePanel } from "./performance-panel";

/** `/company-dashboard` (CompanyDashboardComponent). */
export function CompanyDashboard() {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const { range, setRange, setAggregation } = useDashboardRange();
  if (companyId == null) return <PageLoader />;
  return (
    <>
      <PageHeader title={translate("dashboard.titles.dashboard")} />
      {/* One period for the whole dashboard, so the panels can be compared. */}
      <div className="sticky top-12 z-10 -mx-4 -my-3 flex flex-wrap items-center gap-2 bg-page/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <RangeControls range={range} setRange={setRange} setAggregation={setAggregation} />
      </div>
      <DeliveriesPanel companyId={companyId} range={range} />
      <PerformancePanel companyId={companyId} range={range} />
    </>
  );
}
