import type { Bounds, Point, Via } from "@tscircuit/find-convex-regions"
import type { JRegion, JumperGraph } from "@tscircuit/hypergraph"

export type JumperOrientation = "horizontal" | "vertical"
export type JumperPatternName = "grid" | "staggered"
export type StaggerAxis = "x" | "y"

export interface Generate0603JumperHyperGraphOptions {
  cols: number
  rows: number
  pattern?: JumperPatternName
  colSpacing?: number
  rowSpacing?: number
  pitchX?: number
  pitchY?: number
  staggerAxis?: StaggerAxis
  staggerOffset?: number
  staggerOffsetX?: number
  padWidth?: number
  padHeight?: number
  padGap?: number
  viaDiameter?: number
  clearance?: number
  concavityTolerance?: number
  boundsPadding?: number
  orientation?: JumperOrientation
  portSpacing?: number
}

export interface Resolved0603GridOptions {
  cols: number
  rows: number
  pattern: JumperPatternName
  pitchX: number
  pitchY: number
  staggerAxis: StaggerAxis
  staggerOffset: number
  staggerOffsetX: number
  padWidth: number
  padHeight: number
  padGap: number
  viaDiameter: number
  clearance: number
  concavityTolerance: number
  boundsPadding: number
  orientation: JumperOrientation
  portSpacing: number
}

export interface JumperPlacement {
  jumperId: string
  center: Point
  orientation: JumperOrientation
  padCenters: [Point, Point]
}

export interface JumperPatternResult {
  jumpers: JumperPlacement[]
  vias: Via[]
  bounds: Bounds
}

export interface JumperHyperGraph extends JumperGraph {
  topLayerRegions: JRegion[]
  jumperRegions: JRegion[]
  jumpers: JumperPlacement[]
  vias: Via[]
  bounds: Bounds
}
