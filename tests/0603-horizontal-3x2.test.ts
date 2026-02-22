import { expect, test } from "bun:test"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-horizontal-3x2", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 3,
    rows: 2,
    orientation: "horizontal",
  })

  expect(graph.jumperRegions).toHaveLength(18)
  expect(graph.topLayerRegions.length).toBeGreaterThan(0)

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
  )
})
