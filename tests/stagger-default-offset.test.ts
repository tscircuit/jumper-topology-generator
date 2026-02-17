import { expect, test } from "bun:test"
import { generate0603JumperHyperGraph } from "../lib/index"

const getJumperById = (
  graph: ReturnType<typeof generate0603JumperHyperGraph>,
  id: string,
) => {
  const jumper = graph.jumpers.find((j) => j.jumperId === id)
  if (!jumper) throw new Error(`Missing jumper ${id}`)
  return jumper
}

test("stagger default offset uses half jumper size", () => {
  const horizontalX = generate0603JumperHyperGraph({
    cols: 2,
    rows: 2,
    pattern: "staggered",
    staggerAxis: "x",
    orientation: "horizontal",
  })

  const hBase = getJumperById(horizontalX, "jumper_r0_c0").center
  const hOffset = getJumperById(horizontalX, "jumper_r1_c0").center
  expect(hOffset.x - hBase.x).toBeCloseTo((0.35 + 0.9 * 2) / 2, 6)

  const verticalY = generate0603JumperHyperGraph({
    cols: 2,
    rows: 2,
    pattern: "staggered",
    staggerAxis: "y",
    orientation: "vertical",
  })

  const vBase = getJumperById(verticalY, "jumper_r0_c0").center
  const vOffset = getJumperById(verticalY, "jumper_r0_c1").center
  expect(vOffset.y - vBase.y).toBeCloseTo((0.35 + 0.9 * 2) / 2, 6)
})
