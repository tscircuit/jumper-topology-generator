import type { Bounds, Point } from "@tscircuit/find-convex-regions"
import type {
  Generate0603JumperHyperGraphOptions,
  JumperPatternResult,
  Resolved0603GridOptions,
  StaggerAxis,
} from "../types"

const getJumperSizeAlongAxis = (
  orientation: Resolved0603GridOptions["orientation"],
  axis: StaggerAxis,
  padWidth: number,
  padHeight: number,
  padGap: number,
): number => {
  const horizontalSizeX = padGap + padWidth * 2
  const horizontalSizeY = padHeight
  const verticalSizeX = padHeight
  const verticalSizeY = padGap + padWidth * 2

  if (orientation === "horizontal") {
    return axis === "x" ? horizontalSizeX : horizontalSizeY
  }

  return axis === "x" ? verticalSizeX : verticalSizeY
}

const DEFAULT_0603_GRID_OPTIONS: Omit<
  Resolved0603GridOptions,
  "cols" | "rows"
> = {
  pattern: "grid",
  pitchX: 2.2,
  pitchY: 1.8,
  staggerAxis: "x",
  staggerOffset: 1.1,
  staggerOffsetX: 1.1,
  padWidth: 0.9,
  padHeight: 1.0,
  padGap: 0.35,
  viaDiameter: 0.3,
  clearance: 0.2,
  concavityTolerance: 0.8,
  boundsPadding: 1.2,
  orientation: "horizontal",
}

export const resolve0603GridOptions = (
  input: Generate0603JumperHyperGraphOptions,
): Resolved0603GridOptions => {
  const resolvedOrientation =
    input.orientation ?? DEFAULT_0603_GRID_OPTIONS.orientation
  const resolvedStaggerAxis =
    input.staggerAxis ?? DEFAULT_0603_GRID_OPTIONS.staggerAxis
  const resolvedPadWidth = input.padWidth ?? DEFAULT_0603_GRID_OPTIONS.padWidth
  const resolvedPadHeight =
    input.padHeight ?? DEFAULT_0603_GRID_OPTIONS.padHeight
  const resolvedPadGap = input.padGap ?? DEFAULT_0603_GRID_OPTIONS.padGap

  const resolvedPitchX =
    input.colSpacing ?? input.pitchX ?? DEFAULT_0603_GRID_OPTIONS.pitchX
  const resolvedPitchY =
    input.rowSpacing ?? input.pitchY ?? DEFAULT_0603_GRID_OPTIONS.pitchY
  const resolvedDefaultStaggerOffset =
    getJumperSizeAlongAxis(
      resolvedOrientation,
      resolvedStaggerAxis,
      resolvedPadWidth,
      resolvedPadHeight,
      resolvedPadGap,
    ) / 2
  const resolvedStaggerOffset =
    input.staggerOffset ?? input.staggerOffsetX ?? resolvedDefaultStaggerOffset

  const options: Resolved0603GridOptions = {
    ...DEFAULT_0603_GRID_OPTIONS,
    ...input,
    orientation: resolvedOrientation,
    staggerAxis: resolvedStaggerAxis,
    pitchX: resolvedPitchX,
    pitchY: resolvedPitchY,
    padWidth: resolvedPadWidth,
    padHeight: resolvedPadHeight,
    padGap: resolvedPadGap,
    staggerOffset: resolvedStaggerOffset,
    staggerOffsetX: resolvedStaggerOffset,
    concavityTolerance:
      input.concavityTolerance ?? DEFAULT_0603_GRID_OPTIONS.concavityTolerance,
  }

  if (options.cols <= 0 || options.rows <= 0) {
    throw new Error("rows and cols must be > 0")
  }

  return options
}

export const generate0603GridPattern = (
  options: Resolved0603GridOptions,
): JumperPatternResult => {
  const jumpers = [] as JumperPatternResult["jumpers"]
  const vias = [] as JumperPatternResult["vias"]

  const padOffset = options.padGap / 2 + options.padWidth / 2
  const xStart = -((options.cols - 1) * options.pitchX) / 2
  const yStart = -((options.rows - 1) * options.pitchY) / 2

  for (let row = 0; row < options.rows; row++) {
    for (let col = 0; col < options.cols; col++) {
      const center: Point = {
        x: xStart + col * options.pitchX,
        y: yStart + row * options.pitchY,
      }

      const pad1: Point =
        options.orientation === "horizontal"
          ? { x: center.x - padOffset, y: center.y }
          : { x: center.x, y: center.y - padOffset }
      const pad2: Point =
        options.orientation === "horizontal"
          ? { x: center.x + padOffset, y: center.y }
          : { x: center.x, y: center.y + padOffset }

      const jumperId = `jumper_r${row}_c${col}`
      jumpers.push({
        jumperId,
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

  const bounds: Bounds = {
    minX: xStart - padOffset - options.padWidth / 2 - options.boundsPadding,
    maxX:
      xStart +
      (options.cols - 1) * options.pitchX +
      padOffset +
      options.padWidth / 2 +
      options.boundsPadding,
    minY: yStart - padOffset - options.padHeight / 2 - options.boundsPadding,
    maxY:
      yStart +
      (options.rows - 1) * options.pitchY +
      padOffset +
      options.padHeight / 2 +
      options.boundsPadding,
  }

  return { jumpers, vias, bounds }
}
