import { expect, test } from "bun:test"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-staggered-y-3x3", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 3,
    rows: 3,
    pattern: "staggered",
    staggerAxis: "y",
    staggerOffset: 0.7,
    colSpacing: 2.1,
    rowSpacing: 1.7,
    orientation: "vertical",
  })

  expect(graph.jumperRegions).toHaveLength(9)
  expect(graph.topLayerRegions.length).toBeGreaterThan(0)

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
  )
})
