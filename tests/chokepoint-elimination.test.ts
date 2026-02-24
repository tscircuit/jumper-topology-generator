import { expect, test } from "bun:test"
import type { Point } from "@tscircuit/find-convex-regions"
import { splitPolygonsOnChokepoints } from "../lib/chokepointElimination"
import { createTopLayerPorts, createTopLayerRegions } from "../lib/topology"

const dumbbellPolygon: Point[] = [
  { x: -4, y: -3 },
  { x: -0.2, y: -3 },
  { x: -0.2, y: -0.3 },
  { x: 0.2, y: -0.3 },
  { x: 0.2, y: -3 },
  { x: 4, y: -3 },
  { x: 4, y: 3 },
  { x: 0.2, y: 3 },
  { x: 0.2, y: 0.3 },
  { x: -0.2, y: 0.3 },
  { x: -0.2, y: 3 },
  { x: -4, y: 3 },
]

test("chokepoint elimination splits narrow-neck polygons", () => {
  const split = splitPolygonsOnChokepoints([dumbbellPolygon], {
    maxNeckRatio: 1,
    minSplitBalanceRatio: 0.02,
  })

  expect(split.length).toBeGreaterThan(1)

  const regions = createTopLayerRegions(split)
  const ports = createTopLayerPorts(regions, 0.25)
  expect(ports.length).toBeGreaterThan(0)
})

test("chokepoint elimination is disabled at zero maxNeckRatio", () => {
  const split = splitPolygonsOnChokepoints([dumbbellPolygon], {
    maxNeckRatio: 0,
    minSplitBalanceRatio: 0.2,
  })

  expect(split).toHaveLength(1)
})
