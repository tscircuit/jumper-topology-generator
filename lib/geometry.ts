import type { Bounds, Point } from "@tscircuit/find-convex-regions"

export const avgPoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export const distSquared = (a: Point, b: Point): number =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2

export const toBounds = (poly: Point[]): Bounds => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return { minX, minY, maxX, maxY }
}

export const toCenter = (bounds: Bounds): Point => ({
  x: (bounds.minX + bounds.maxX) / 2,
  y: (bounds.minY + bounds.maxY) / 2,
})

export const boundsToPolygon = (bounds: Bounds): Point[] => [
  { x: bounds.minX, y: bounds.minY },
  { x: bounds.maxX, y: bounds.minY },
  { x: bounds.maxX, y: bounds.maxY },
  { x: bounds.minX, y: bounds.maxY },
]

export const almostEqual = (a: number, b: number, tolerance: number): boolean =>
  Math.abs(a - b) <= tolerance

export const pointsEqual = (a: Point, b: Point, tolerance: number): boolean =>
  almostEqual(a.x, b.x, tolerance) && almostEqual(a.y, b.y, tolerance)
