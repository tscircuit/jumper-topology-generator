import { expect, test } from "bun:test"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

const regionsTouchOrOverlap = (
  a: { minX: number; maxX: number; minY: number; maxY: number },
  b: { minX: number; maxX: number; minY: number; maxY: number },
) => !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)

test("0603-staggered-y-3x3", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 3,
    rows: 3,
    pattern: "staggered",
    staggerAxis: "y",
    staggerOffset: 0.7,
    colSpacing: 2.1,
    rowSpacing: 2.5,
    orientation: "vertical",
  })

  expect(graph.jumperRegions).toHaveLength(27)
  expect(graph.topLayerRegions.length).toBeGreaterThan(0)

  for (let i = 0; i < graph.jumperRegions.length; i++) {
    for (let j = i + 1; j < graph.jumperRegions.length; j++) {
      const a = graph.jumperRegions[i]
      const b = graph.jumperRegions[j]
      if (!a || !b) continue
      if (
        a.regionId.split("_").slice(0, 3).join("_") ===
        b.regionId.split("_").slice(0, 3).join("_")
      ) {
        continue
      }
      expect(regionsTouchOrOverlap(a.d.bounds, b.d.bounds)).toBe(false)
    }
  }

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
  )
})
