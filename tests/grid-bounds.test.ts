import assert from "node:assert/strict"
import { test } from "bun:test"
import { generate0603Pattern } from "../lib/patterns/index"
import { resolve0603GridOptions } from "../lib/patterns/grid0603"
import type { Generate0603JumperHyperGraphOptions } from "../lib/types"

const cases: [string, Generate0603JumperHyperGraphOptions][] = [
  [
    "vertical wide pad",
    {
      cols: 1,
      rows: 1,
      orientation: "vertical",
      padHeight: 10,
    },
  ],
  [
    "vertical long body",
    {
      cols: 2,
      rows: 2,
      orientation: "vertical",
      padWidth: 4,
    },
  ],
  [
    "vertical wide and long pads",
    {
      cols: 2,
      rows: 3,
      orientation: "vertical",
      padWidth: 4,
      padHeight: 10,
    },
  ],
  [
    "vertical wide pad without padding",
    {
      cols: 1,
      rows: 1,
      orientation: "vertical",
      padHeight: 4,
      boundsPadding: 0,
    },
  ],
  [
    "vertical long body without padding",
    {
      cols: 1,
      rows: 1,
      orientation: "vertical",
      padWidth: 2,
      padHeight: 1,
      boundsPadding: 0,
    },
  ],
  [
    "vertical rectangular grid",
    {
      cols: 3,
      rows: 2,
      orientation: "vertical",
      padHeight: 5,
      pitchX: 10,
      pitchY: 8,
    },
  ],
  [
    "vertical column spacing alias",
    {
      cols: 3,
      rows: 1,
      orientation: "vertical",
      padHeight: 5,
      pitchX: 50,
      colSpacing: 12,
    },
  ],
  [
    "vertical row spacing alias",
    {
      cols: 1,
      rows: 3,
      orientation: "vertical",
      padWidth: 4,
      pitchY: 50,
      rowSpacing: 12,
    },
  ],
  [
    "vertical small dimensions",
    {
      cols: 2,
      rows: 2,
      orientation: "vertical",
      padWidth: 0.002,
      padHeight: 0.001,
      padGap: 0,
      boundsPadding: 0,
      clearance: 0,
      pitchX: 0.01,
      pitchY: 0.01,
    },
  ],
  [
    "vertical large dimensions",
    {
      cols: 2,
      rows: 2,
      orientation: "vertical",
      padWidth: 200,
      padHeight: 100,
      padGap: 0,
      boundsPadding: 1,
      pitchX: 500,
      pitchY: 500,
    },
  ],
  [
    "horizontal wide pad control",
    {
      cols: 2,
      rows: 2,
      padHeight: 10,
    },
  ],
  [
    "horizontal long body control",
    {
      cols: 2,
      rows: 2,
      padWidth: 4,
    },
  ],
  [
    "horizontal custom dimensions control",
    {
      cols: 2,
      rows: 2,
      padWidth: 4,
      padHeight: 10,
    },
  ],
  [
    "default horizontal control",
    {
      cols: 3,
      rows: 2,
    },
  ],
  [
    "default vertical control",
    {
      cols: 2,
      rows: 2,
      orientation: "vertical",
    },
  ],
  [
    "staggered X control",
    {
      cols: 3,
      rows: 2,
      orientation: "vertical",
      pattern: "staggered",
      staggerAxis: "x",
      padHeight: 10,
    },
  ],
  [
    "staggered Y control",
    {
      cols: 2,
      rows: 3,
      orientation: "vertical",
      pattern: "staggered",
      staggerAxis: "y",
      padWidth: 4,
    },
  ],
  [
    "staggered horizontal control",
    {
      cols: 3,
      rows: 2,
      pattern: "staggered",
      padHeight: 10,
    },
  ],
]

for (const [name, input] of cases) {
  test(`bounds contain pad rectangles and padding: ${name}`, () => {
    const options = resolve0603GridOptions(input)
    const result = generate0603Pattern(options)
    // These are the actual rectangle dimensions used by generate0603JumperHyperGraph.
    const width =
      options.orientation === "horizontal" ? options.padWidth : options.padHeight
    const height =
      options.orientation === "horizontal" ? options.padHeight : options.padWidth
    const tolerance =
      1e-10 *
      Math.max(
        1,
        Math.abs(result.bounds.minX),
        Math.abs(result.bounds.maxX),
        Math.abs(result.bounds.minY),
        Math.abs(result.bounds.maxY),
      )
    for (const jumper of result.jumpers) {
      for (const center of jumper.padCenters) {
        assert.ok(
          result.bounds.minX <=
            center.x - width / 2 - options.boundsPadding + tolerance,
          "left pad edge plus padding",
        )
        assert.ok(
          result.bounds.maxX >=
            center.x + width / 2 + options.boundsPadding - tolerance,
          "right pad edge plus padding",
        )
        assert.ok(
          result.bounds.minY <=
            center.y - height / 2 - options.boundsPadding + tolerance,
          "bottom pad edge plus padding",
        )
        assert.ok(
          result.bounds.maxY >=
            center.y + height / 2 + options.boundsPadding - tolerance,
          "top pad edge plus padding",
        )
      }
    }
    assert.equal(result.jumpers.length, input.cols * input.rows)
    assert.equal(result.vias.length, 2 * input.cols * input.rows)
  })
}

test("keeps the existing default horizontal outer frame", () => {
  const result = generate0603Pattern(
    resolve0603GridOptions({ cols: 3, rows: 2 }),
  )
  assert.deepEqual(result.bounds, {
    minX: -4.625,
    maxX: 4.625,
    minY: -3.2249999999999996,
    maxY: 3.2249999999999996,
  })
})

test("keeps the existing default vertical outer frame", () => {
  const result = generate0603Pattern(
    resolve0603GridOptions({ cols: 2, rows: 2, orientation: "vertical" }),
  )
  assert.deepEqual(result.bounds, { minX: -3.375, maxX: 3.375, minY: -3.5, maxY: 3.5 })
})

test("does not tighten a custom horizontal outer frame", () => {
  const result = generate0603Pattern(
    resolve0603GridOptions({
      cols: 2,
      rows: 2,
      padWidth: 2,
      padHeight: 1,
      padGap: 0,
      pitchX: 8,
      pitchY: 6,
      boundsPadding: 1,
    }),
  )
  assert.deepEqual(result.bounds, { minX: -7, maxX: 7, minY: -5.5, maxY: 5.5 })
})

test("expands only the insufficient vertical axis and retains the wider old axis", () => {
  const result = generate0603Pattern(
    resolve0603GridOptions({
      cols: 1,
      rows: 1,
      orientation: "vertical",
      padWidth: 2,
      padHeight: 1,
      padGap: 0,
      boundsPadding: 0,
    }),
  )
  assert.deepEqual(result.bounds, { minX: -2, maxX: 2, minY: -2, maxY: 2 })
})

test("does not move jumper centers, pads or vias while expanding bounds", () => {
  const result = generate0603Pattern(
    resolve0603GridOptions({
      cols: 1,
      rows: 1,
      orientation: "vertical",
      padWidth: 2,
      padHeight: 1,
      padGap: 0,
      boundsPadding: 0,
    }),
  )
  assert.deepEqual(result.jumpers, [
    {
      jumperId: "jumper_r0_c0",
      center: { x: 0, y: 0 },
      orientation: "vertical",
      padCenters: [{ x: 0, y: -1 }, { x: 0, y: 1 }],
    },
  ])
  assert.deepEqual(result.vias, [
    { center: { x: 0, y: -1 }, diameter: 0.3 },
    { center: { x: 0, y: 1 }, diameter: 0.3 },
  ])
})

for (const orientation of ["horizontal", "vertical"] as const) {
  test(`preserves accepted zero-sized pad behavior: ${orientation}`, () => {
    const result = generate0603Pattern(
      resolve0603GridOptions({
        cols: 1,
        rows: 1,
        orientation,
        padWidth: 0,
        padHeight: 0,
        padGap: 0,
        boundsPadding: 1,
      }),
    )
    assert.deepEqual(result.bounds, { minX: -1, maxX: 1, minY: -1, maxY: 1 })
    assert.equal(result.jumpers.length, 1)
    assert.equal(result.vias.length, 2)
  })
}

test("retains rejected rows and columns", () => {
  for (const input of [
    { cols: 0, rows: 1 },
    { cols: 1, rows: 0 },
    { cols: -1, rows: 1 },
  ]) {
    assert.throws(() => resolve0603GridOptions(input), /rows and cols must be > 0/)
  }
})

test("retains rejected port spacing", () => {
  for (const portSpacing of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => resolve0603GridOptions({ cols: 1, rows: 1, portSpacing }),
      /portSpacing must be > 0/,
    )
  }
})

test("retains pitch clamping and explicit spacing aliases", () => {
  const options = resolve0603GridOptions({
    cols: 2,
    rows: 2,
    orientation: "vertical",
    padWidth: 2,
    padHeight: 10,
    padGap: 0,
    pitchX: 100,
    pitchY: 100,
    colSpacing: 1,
    rowSpacing: 1,
  })
  assert.equal(options.pitchX, 10.2)
  assert.equal(options.pitchY, 4.2)
})
