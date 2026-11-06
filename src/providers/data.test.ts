import { describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { changeLocale } from "@/lib/i18n";
import { companyCustomer } from "../../test/factories";
import { fail, ok, on, paged, requestsTo, server } from "../../test/msw";
import { dataProvider } from "./data";

describe("dataProvider", () => {
  describe("getList", () => {
    it("maps pagination, sorting and filters to InaTrace query params and unwraps { items, count }", async () => {
      server.use(on(ep.getCompanyCustomersList, () => paged([companyCustomer()], 41)));

      const result = await dataProvider.getList({
        resource: "company-customers",
        meta: { companyId: 7 },
        pagination: { currentPage: 3, pageSize: 20 },
        sorters: [{ field: "BY_NAME", order: "desc" }],
        filters: [{ field: "query", operator: "eq", value: "acme" }],
      });

      expect(result.total).toBe(41);
      expect(result.data).toEqual([companyCustomer()]);
      const [{ url }] = requestsTo(ep.getCompanyCustomersList);
      expect(url.pathname).toBe("/api/company/companyCustomers/list/7");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        limit: "20",
        offset: "40",
        sortBy: "BY_NAME",
        sort: "DESC",
        query: "acme",
      });
    });

    it("asks for everything when pagination is off", async () => {
      server.use(on(ep.listAllFacilitiesByCompany, () => paged([])));
      await dataProvider.getList({ resource: "facilities", meta: { companyId: 1 }, pagination: { mode: "off" } });
      const [{ url }] = requestsTo(ep.listAllFacilitiesByCompany);
      expect(url.searchParams.get("limit")).toBe("1000");
      expect(url.searchParams.has("offset")).toBe(false);
    });
  });

  describe("create", () => {
    it("POSTs when the endpoint is a POST", async () => {
      server.use(on(ep.createCompanyCustomer, ({ body }) => ok({ ...body, id: 9 })));
      const { data } = await dataProvider.create({ resource: "company-customers", variables: { name: "Acme", companyId: 1 } });
      expect(requestsTo(ep.createCompanyCustomer)).toHaveLength(1);
      expect(data).toMatchObject({ id: 9, name: "Acme" });
    });

    it("sends create-or-update PUT endpoints as a PUT without an id in the URL", async () => {
      server.use(on(ep.createOrUpdateFacility, () => ok({ id: 33, name: "Washing station" })));
      const { data } = await dataProvider.create({ resource: "facilities", variables: { name: "Washing station" } });
      const [request] = requestsTo(ep.createOrUpdateFacility);
      expect(request.url.pathname).toBe("/api/chain/facility");
      expect(request.body).toEqual({ name: "Washing station" });
      expect(data).toMatchObject({ id: 33 });
    });
  });

  it("update sends the id in the body and falls back to the variables when the backend returns no data", async () => {
    server.use(on(ep.updateCompanyCustomer, () => ({ status: "OK" }) as never));
    const { data } = await dataProvider.update({ resource: "company-customers", id: "5", variables: { name: "New" } });
    expect(requestsTo(ep.updateCompanyCustomer)[0].body).toEqual({ id: 5, name: "New" });
    expect(data).toEqual({ id: "5", name: "New" });
  });

  it("loads a facility through the detail endpoint, which includes its translations", async () => {
    server.use(on(ep.getFacilityDetail, ({ params }) => ok({ id: Number(params.id), translations: [{ language: "EN", name: "Mill" }] })));
    const { data } = await dataProvider.getOne({ resource: "facilities", id: 4 });
    expect(requestsTo(ep.getFacilityDetail)[0].url.pathname).toBe("/api/chain/facility/4/detail");
    expect(data).toMatchObject({ translations: [{ language: "EN", name: "Mill" }] });
  });

  it("deleteOne calls the resource's delete endpoint", async () => {
    server.use(on(ep.deleteCompanyCustomer, () => ({ status: "OK" }) as never));
    await dataProvider.deleteOne({ resource: "company-customers", id: 12 });
    expect(requestsTo(ep.deleteCompanyCustomer)[0].url.pathname).toBe("/api/company/companyCustomers/12");
  });

  describe("errors", () => {
    it("maps a 400 with field errors to ApiError and toasts exactly once", async () => {
      const add = vi.spyOn(toast, "add");
      server.use(on(ep.createCompanyCustomer, () => fail(400, "VALIDATION_ERROR", { email: "invalid" })));

      const error = await dataProvider.create({ resource: "company-customers", variables: {} }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ statusCode: 400, apiStatus: "ERROR", errors: { email: "invalid" } });
      expect(add).toHaveBeenCalledTimes(1);
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
    });

    it("treats HTTP 200 with a non-OK envelope as a failure", async () => {
      server.use(on(ep.getCompanyCustomer, () => ({ status: "ERROR", errorMessage: "NOT_FOUND" }) as never));
      await expect(dataProvider.getOne({ resource: "company-customers", id: 1 })).rejects.toMatchObject({
        message: "NOT_FOUND",
      });
    });

    it("rejects operations a resource doesn't define", async () => {
      await expect(dataProvider.deleteOne({ resource: "companies", id: 1 })).rejects.toMatchObject({ statusCode: 501 });
    });
  });

  it("sends the current locale in the language header", async () => {
    server.use(on(ep.getCompanyCustomer, () => ok(companyCustomer())));
    await changeLocale("de");
    await dataProvider.getOne({ resource: "company-customers", id: 1 });
    expect(requestsTo(ep.getCompanyCustomer)[0].headers.get("language")).toBe("DE");
  });
});
