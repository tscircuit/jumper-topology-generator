import { expect, test } from "bun:test"
import { getSvgFromGraphicsObject } from "graphics-debug"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-svg-export-2x1", async () => {
  const graph = generate0603JumperHyperGraph({
    cols: 2,
    rows: 1,
    orientation: "horizontal",
  })

  const svg = getSvgFromGraphicsObject(visualizeJumperHyperGraph(graph))
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
