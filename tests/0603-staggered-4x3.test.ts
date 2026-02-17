import { expect, test } from "bun:test"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-staggered-4x3", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 4,
    rows: 3,
    pattern: "staggered",
    staggerAxis: "x",
    staggerOffset: 1.0,
    colSpacing: 2.8,
    rowSpacing: 1.9,
    concavityTolerance: 0.3,
    orientation: "horizontal",
  })

  expect(graph.jumperRegions).toHaveLength(12)
  expect(graph.topLayerRegions.length).toBeGreaterThan(0)

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
  )
})
