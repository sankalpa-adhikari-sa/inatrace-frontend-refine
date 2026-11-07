import { describe, expect, it } from "vitest";
import { edgeMidpoints, insertOnEdge, moveCorner } from "./plot-geometry";

const a = { lat: 0, lng: 0 };
const b = { lat: 0, lng: 2 };
const c = { lat: 2, lng: 2 };

describe("edgeMidpoints", () => {
  it("has none for fewer than two points", () => {
    expect(edgeMidpoints([])).toEqual([]);
    expect(edgeMidpoints([a])).toEqual([]);
  });

  it("has one edge between two points (no closing edge)", () => {
    expect(edgeMidpoints([a, b])).toEqual([{ index: 0, point: { lat: 0, lng: 1 } }]);
  });

  it("includes the closing edge of a polygon", () => {
    expect(edgeMidpoints([a, b, c])).toEqual([
      { index: 0, point: { lat: 0, lng: 1 } },
      { index: 1, point: { lat: 1, lng: 2 } },
      { index: 2, point: { lat: 1, lng: 1 } },
    ]);
  });
});

describe("insertOnEdge", () => {
  const p = { lat: 9, lng: 9 };

  it("adds the corner after the edge's first corner", () => {
    expect(insertOnEdge([a, b, c], 0, p)).toEqual([a, p, b, c]);
  });

  it("adds a corner on the closing edge at the end", () => {
    expect(insertOnEdge([a, b, c], 2, p)).toEqual([a, b, c, p]);
  });

  it("leaves the original untouched", () => {
    const points = [a, b, c];
    insertOnEdge(points, 1, p);
    expect(points).toEqual([a, b, c]);
  });
});

describe("moveCorner", () => {
  it("replaces only the moved corner", () => {
    const p = { lat: 5, lng: 5 };
    expect(moveCorner([a, b, c], 1, p)).toEqual([a, p, c]);
  });
});
