import type { Bounds, Point } from "@tscircuit/find-convex-regions"
import type { JumperPatternResult, Resolved0603GridOptions } from "../types"

const computeBoundsFromJumpers = (
  jumpers: JumperPatternResult["jumpers"],
  options: Resolved0603GridOptions,
): Bounds => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const jumper of jumpers) {
    for (const pad of jumper.padCenters) {
      const xHalf =
        options.orientation === "horizontal"
          ? options.padWidth / 2
          : options.padHeight / 2
      const yHalf =
        options.orientation === "horizontal"
          ? options.padHeight / 2
          : options.padWidth / 2

      if (pad.x - xHalf < minX) minX = pad.x - xHalf
      if (pad.y - yHalf < minY) minY = pad.y - yHalf
      if (pad.x + xHalf > maxX) maxX = pad.x + xHalf
      if (pad.y + yHalf > maxY) maxY = pad.y + yHalf
    }
  }

  return {
    minX: minX - options.boundsPadding,
    minY: minY - options.boundsPadding,
    maxX: maxX + options.boundsPadding,
    maxY: maxY + options.boundsPadding,
  }
}

export const generate0603StaggeredPattern = (
  options: Resolved0603GridOptions,
): JumperPatternResult => {
  const jumpers = [] as JumperPatternResult["jumpers"]
  const vias = [] as JumperPatternResult["vias"]

  const padOffset = options.padGap / 2 + options.padWidth / 2
  const xStart = -((options.cols - 1) * options.pitchX) / 2
  const yStart = -((options.rows - 1) * options.pitchY) / 2

  for (let row = 0; row < options.rows; row++) {
    const rowOffset =
      options.staggerAxis === "x" && row % 2 === 1 ? options.staggerOffset : 0

    for (let col = 0; col < options.cols; col++) {
      const colOffset =
        options.staggerAxis === "y" && col % 2 === 1 ? options.staggerOffset : 0

      const center: Point = {
        x: xStart + col * options.pitchX + rowOffset,
        y: yStart + row * options.pitchY + colOffset,
      }

      const pad1: Point =
        options.orientation === "horizontal"
          ? { x: center.x - padOffset, y: center.y }
          : { x: center.x, y: center.y - padOffset }
      const pad2: Point =
        options.orientation === "horizontal"
          ? { x: center.x + padOffset, y: center.y }
          : { x: center.x, y: center.y + padOffset }

      jumpers.push({
        jumperId: `jumper_r${row}_c${col}`,
        center,
        orientation: options.orientation,
        padCenters: [pad1, pad2],
      })

      vias.push(
        { center: pad1, diameter: options.viaDiameter },
        { center: pad2, diameter: options.viaDiameter },
      )
    }
  }

  return {
    jumpers,
    vias,
    bounds: computeBoundsFromJumpers(jumpers, options),
  }
}
