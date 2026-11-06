import { PageHeader, PageLoader } from "@/components/app/page";
import { useSelectedCompany } from "@/hooks/use-session";
import { useTranslate } from "@refinedev/core";
import { DeliveriesPanel } from "./deliveries-panel";
import { PerformancePanel } from "./performance-panel";

/** `/company-dashboard` (CompanyDashboardComponent). */
export function CompanyDashboard() {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  if (companyId == null) return <PageLoader />;
  return (
    <>
      <PageHeader title={translate("dashboard.titles.dashboard")} />
      <DeliveriesPanel companyId={companyId} />
      <PerformancePanel companyId={companyId} />
    </>
  );
}
