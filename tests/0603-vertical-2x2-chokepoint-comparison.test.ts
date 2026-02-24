import { expect, test } from "bun:test"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { stackSvgsHorizontally } from "stack-svgs"
import {
  generate0603JumperHyperGraph,
  visualizeJumperHyperGraph,
} from "../lib/index"

test("0603-vertical-2x2 chokepoint elimination comparison", async () => {
  const baseInput = {
    cols: 2,
    rows: 2,
    orientation: "vertical" as const,
    pitchX: 2.0,
    pitchY: 2.0,
  }

  const before = generate0603JumperHyperGraph(baseInput)
  const after = generate0603JumperHyperGraph({
    ...baseInput,
    maxNeckRatio: 0.4,
    minSplitBalanceRatio: 0.2,
  })

  const beforeSvg = getSvgFromGraphicsObject(visualizeJumperHyperGraph(before))
  const afterSvg = getSvgFromGraphicsObject(visualizeJumperHyperGraph(after))
  const comparison = stackSvgsHorizontally([beforeSvg, afterSvg], {
    gap: 24,
    normalizeSize: false,
  })

  await expect(comparison).toMatchSvgSnapshot(import.meta.path)
})
