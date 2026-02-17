import { expect, test } from "bun:test"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-vertical-2x2", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 2,
    rows: 2,
    orientation: "vertical",
    pitchX: 2.0,
    pitchY: 2.0,
  })

  expect(graph.jumperRegions).toHaveLength(4)
  expect(graph.ports.length).toBeGreaterThan(0)

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
  )
})
