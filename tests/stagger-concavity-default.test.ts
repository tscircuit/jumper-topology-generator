import { expect, test } from "bun:test"
import { resolve0603GridOptions } from "../lib/index"

test("staggered pattern inherits default concavity tolerance", () => {
  const defaults = resolve0603GridOptions({
    cols: 2,
    rows: 2,
    pattern: "staggered",
  })
  expect(defaults.concavityTolerance).toBe(0.8)

  const undefinedOverride = resolve0603GridOptions({
    cols: 2,
    rows: 2,
    pattern: "staggered",
    concavityTolerance: undefined,
  })
  expect(undefinedOverride.concavityTolerance).toBe(0.8)
})
