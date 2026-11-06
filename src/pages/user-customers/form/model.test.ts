import { describe, expect, it } from "vitest";
import type { ApiUserCustomer } from "@/client/types.gen";
import { toForm, withAreaUnit } from "./model";

describe("user-customer toForm", () => {
  it("defaults missing lists so field arrays can render", () => {
    const form = toForm({ id: 1, name: "Ana" });
    expect(form).toMatchObject({ associations: [], cooperatives: [], certifications: [], plots: [], productTypes: [] });
    expect(form.farm?.farmPlantInformationList).toEqual([]);
  });

  it("cuts ISO timestamps down to yyyy-mm-dd for date inputs", () => {
    const form = toForm({
      certifications: [{ validity: "2027-03-01T00:00:00.000Z" }],
      plots: [{ organicStartOfTransition: "2025-01-15T10:20:30Z" }],
      farm: { startTransitionToOrganic: "2024-06-30T00:00:00Z" },
    } as ApiUserCustomer);
    expect(form.certifications?.[0].validity).toBe("2027-03-01");
    expect(form.plots?.[0].organicStartOfTransition).toBe("2025-01-15");
    expect(form.farm?.startTransitionToOrganic).toBe("2024-06-30");
  });

  it.each([
    [true, "true"],
    [false, "false"],
    [undefined, null],
  ])("maps publiclyVisible %j to the select value %j", (value, expected) => {
    expect(toForm({ location: { publiclyVisible: value } }).location.publiclyVisible).toBe(expected);
  });

  it("does not mutate its input", () => {
    const input: ApiUserCustomer = { plots: [{ organicStartOfTransition: "2025-01-15T10:20:30Z" }] };
    toForm(input);
    expect(input.plots?.[0].organicStartOfTransition).toBe("2025-01-15T10:20:30Z");
  });
});

describe("withAreaUnit", () => {
  it("appends the unit when there is one", () => {
    expect(withAreaUnit("Area", "ha")).toBe("Area (ha)");
    expect(withAreaUnit("Area")).toBe("Area");
  });
});
