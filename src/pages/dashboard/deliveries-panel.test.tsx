import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ApiFacility } from "@/client/types.gen";
import { ep } from "@/lib/endpoints";
import { ok, on, paged, server } from "../../../test/msw";
import { renderWithRefine } from "../../../test/render";
import { tr } from "../../../test/tr";
import type { DashboardRange } from "./controls";
import { DeliveriesPanel } from "./deliveries-panel";

const RANGE: DashboardRange = { from: "2024-01-01", to: "2026-06-30", aggregation: "MONTH" };

const facility = {
  id: 5,
  name: "Washing station",
  facilitySemiProductList: [{ id: 9, name: "Cherries", measurementUnitType: { label: "kg" } }],
} as ApiFacility;

// 30 months, oldest first; month n delivered n × 100 kg.
const totals = Array.from({ length: 30 }, (_, i) => ({
  unit: String((i % 12) + 1),
  year: 2024 + Math.floor(i / 12),
  totalQuantity: (i + 1) * 100,
}));

describe("DeliveriesPanel", () => {
  it("sums the whole range into stat tiles and plots the latest periods", async () => {
    server.use(
      on(ep.listCollectingFacilitiesByCompany, () => paged([facility])),
      on(ep.getUserCustomersForCompanyAndType, () => paged([])),
      on(ep.getDeliveriesAggregatedData, () => ok({ unitType: "MONTH", totals })),
    );
    const { user } = renderWithRefine(<DeliveriesPanel companyId={1} range={RANGE} />, { companyId: null });

    // 100 + 200 + … + 3000 = 46,500 kg over 30 months.
    const total = await screen.findByText(tr("dashboard.fields.totalDelivered"));
    expect(total.parentElement).toHaveTextContent(/46\.5K/);
    expect(screen.getByText(tr("dashboard.fields.averagePerPeriod")).parentElement).toHaveTextContent(/1\.6K/);
    expect(screen.getByText(tr("dashboard.fields.busiestPeriod")).parentElement).toHaveTextContent("3,000 kg");

    expect(screen.getByText(tr("dashboard.texts.onlyTheLatestPeriodsAre", { truncated: 24 }))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: tr("dashboard.buttons.showTable") }));
    const rows = within(await screen.findByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(25); // header + the 24 latest months
    expect(rows.at(-1)).toHaveTextContent("3,000"); // the newest, not dropped
    await waitFor(() => expect(rows[1]).toHaveTextContent("700")); // month 7 is the oldest one kept
  });

  it("says why it's empty when the company has no collecting facilities", async () => {
    server.use(
      on(ep.listCollectingFacilitiesByCompany, () => paged([])),
      on(ep.getUserCustomersForCompanyAndType, () => paged([])),
    );
    renderWithRefine(<DeliveriesPanel companyId={1} range={RANGE} />, { companyId: null });
    expect(await screen.findByText(tr("dashboard.texts.noCollectingFacilitiesYet"))).toBeInTheDocument();
  });
});
