import { describe, expect, it } from "vitest";
import { fillPath, toSearchParams } from "./endpoint";

describe("fillPath", () => {
  it("fills {params} from the path args", () => {
    expect(fillPath("/api/company/{companyId}/user/{id}", { companyId: 7, id: 3 })).toBe("/api/company/7/user/3");
  });

  it("falls back to a query arg of the same name", () => {
    expect(fillPath("/api/chain/facility/{id}", undefined, { id: 9 })).toBe("/api/chain/facility/9");
  });

  it("prefers the path arg over the query arg", () => {
    expect(fillPath("/x/{id}", { id: 1 }, { id: 2 })).toBe("/x/1");
  });

  it("URL-encodes values", () => {
    expect(fillPath("/x/{name}", { name: "a b/c" })).toBe("/x/a%20b%2Fc");
  });

  it("leaves an empty segment for a missing param", () => {
    expect(fillPath("/x/{id}/y", {})).toBe("/x//y");
  });
});

describe("toSearchParams", () => {
  it("drops null, undefined and empty strings but keeps 0 and false", () => {
    expect(toSearchParams({ a: null, b: undefined, c: "", d: 0, e: false, f: "x" })).toEqual({ d: 0, e: false, f: "x" });
  });

  it("sends arrays comma-separated, as Spring binds them", () => {
    expect(toSearchParams({ ids: [1, 2, 3] })).toEqual({ ids: "1,2,3" });
  });

  it("accepts no query", () => {
    expect(toSearchParams(undefined)).toEqual({});
  });
});
