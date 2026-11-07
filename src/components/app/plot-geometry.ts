import type { MapPoint } from "./map-view";

/**
 * The handles between a shape's corners. `index` is the edge's first corner: a corner added on
 * that edge goes at `index + 1`. Two points have one edge; a polygon (3+) also has the closing
 * edge from the last corner back to the first.
 */
export function edgeMidpoints(points: MapPoint[]): { index: number; point: MapPoint }[] {
  if (points.length < 2) return [];
  const edges = points.length === 2 ? 1 : points.length;
  return Array.from({ length: edges }, (_, i) => {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    return { index: i, point: { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 } };
  });
}

/** `points` with `p` added on the edge that starts at corner `edge`. */
export function insertOnEdge(points: MapPoint[], edge: number, p: MapPoint): MapPoint[] {
  return [...points.slice(0, edge + 1), p, ...points.slice(edge + 1)];
}

/** `points` with corner `index` moved to `p`. */
export function moveCorner(points: MapPoint[], index: number, p: MapPoint): MapPoint[] {
  return points.map((x, i) => (i === index ? p : x));
}
