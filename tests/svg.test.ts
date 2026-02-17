import { expect, test } from "bun:test"
import { getSvgFromGraphicsObject } from "graphics-debug"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603 jumper topology snapshot: horizontal 3x2", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 3,
    rows: 2,
    orientation: "horizontal",
  })

  expect(graph.jumperRegions).toHaveLength(6)
  expect(graph.topLayerRegions.length).toBeGreaterThan(0)

  await expect(visualizeJumperHyperGraph(graph)).toMatchGraphicsSvg(
    import.meta.path,
    {
      svgName: "0603-horizontal-3x2",
    },
  )
})

test("0603 jumper topology snapshot: vertical 2x2", async () => {
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
    {
      svgName: "0603-vertical-2x2",
    },
  )
})

test("0603 jumper topology snapshot: svg export 2x1", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 2,
    rows: 1,
    orientation: "horizontal",
  })

  const svg = getSvgFromGraphicsObject(visualizeJumperHyperGraph(graph))
  await expect(svg).toMatchSvgSnapshot(import.meta.path, "0603-svg-export-2x1")
})
