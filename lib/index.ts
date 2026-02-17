import {
  type Bounds,
  computeConvexRegions,
  type Point,
  type Via,
} from "@tscircuit/find-convex-regions"
import type { JPort, JRegion, JumperGraph } from "@tscircuit/hypergraph"
import type { GraphicsObject } from "graphics-debug"

export type JumperOrientation = "horizontal" | "vertical"

export interface Generate0603JumperHyperGraphOptions {
  cols: number
  rows: number
  pitchX?: number
  pitchY?: number
  padWidth?: number
  padHeight?: number
  padGap?: number
  viaDiameter?: number
  clearance?: number
  concavityTolerance?: number
  boundsPadding?: number
  orientation?: JumperOrientation
}

export interface JumperPlacement {
  jumperId: string
  center: Point
  orientation: JumperOrientation
  padCenters: [Point, Point]
}

export interface JumperHyperGraph extends JumperGraph {
  topLayerRegions: JRegion[]
  jumperRegions: JRegion[]
  jumpers: JumperPlacement[]
  vias: Via[]
  bounds: Bounds
}

const DEFAULTS = {
  pitchX: 2.2,
  pitchY: 1.8,
  padWidth: 0.9,
  padHeight: 1.0,
  padGap: 0.35,
  viaDiameter: 0.35,
  clearance: 0.2,
  concavityTolerance: 0.08,
  boundsPadding: 1.2,
  orientation: "horizontal" as JumperOrientation,
}

const avgPoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

const distSquared = (a: Point, b: Point): number =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2

const toBounds = (poly: Point[]): Bounds => {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  return { minX, minY, maxX, maxY }
}

const toCenter = (bounds: Bounds): Point => ({
  x: (bounds.minX + bounds.maxX) / 2,
  y: (bounds.minY + bounds.maxY) / 2,
})

const boundsToPolygon = (bounds: Bounds): Point[] => [
  { x: bounds.minX, y: bounds.minY },
  { x: bounds.maxX, y: bounds.minY },
  { x: bounds.maxX, y: bounds.maxY },
  { x: bounds.minX, y: bounds.maxY },
]

const almostEqual = (a: number, b: number, tol: number): boolean =>
  Math.abs(a - b) <= tol

const pointsEqual = (a: Point, b: Point, tol: number): boolean =>
  almostEqual(a.x, b.x, tol) && almostEqual(a.y, b.y, tol)

const createTopLayerPorts = (regions: JRegion[], tolerance = 1e-5): JPort[] => {
  const ports: JPort[] = []
  let nextPort = 0

  for (let i = 0; i < regions.length; i++) {
    const regionA = regions[i]
    if (!regionA?.d.polygon) continue
    for (let j = i + 1; j < regions.length; j++) {
      const regionB = regions[j]
      if (!regionB?.d.polygon) continue

      let sharedMidpoint: Point | null = null

      for (let ai = 0; ai < regionA.d.polygon.length; ai++) {
        const a1 = regionA.d.polygon[ai]
        const a2 = regionA.d.polygon[(ai + 1) % regionA.d.polygon.length]
        if (!a1 || !a2) continue

        for (let bi = 0; bi < regionB.d.polygon.length; bi++) {
          const b1 = regionB.d.polygon[bi]
          const b2 = regionB.d.polygon[(bi + 1) % regionB.d.polygon.length]
          if (!b1 || !b2) continue

          if (
            pointsEqual(a1, b2, tolerance) &&
            pointsEqual(a2, b1, tolerance)
          ) {
            sharedMidpoint = avgPoint(a1, a2)
            break
          }
        }

        if (sharedMidpoint) break
      }

      if (!sharedMidpoint) continue

      ports.push({
        portId: `tp_${nextPort++}`,
        region1: regionA,
        region2: regionB,
        d: { x: sharedMidpoint.x, y: sharedMidpoint.y },
      })
    }
  }

  return ports
}

const getClosestTopLayerRegion = (
  topLayerRegions: JRegion[],
  point: Point,
): JRegion => {
  let best = topLayerRegions[0]
  let bestScore = Number.POSITIVE_INFINITY

  for (const region of topLayerRegions) {
    const score = distSquared(region.d.center, point)
    if (score < bestScore) {
      best = region
      bestScore = score
    }
  }

  if (!best) {
    throw new Error("No top-layer regions were generated")
  }

  return best
}

export const generate0603JumperHyperGraph = (
  input: Generate0603JumperHyperGraphOptions,
): JumperHyperGraph => {
  const {
    cols,
    rows,
    pitchX,
    pitchY,
    padWidth,
    padHeight,
    padGap,
    viaDiameter,
    clearance,
    concavityTolerance,
    boundsPadding,
    orientation,
  } = { ...DEFAULTS, ...input }

  if (cols <= 0 || rows <= 0) {
    throw new Error("rows and cols must be > 0")
  }

  const jumpers: JumperPlacement[] = []
  const vias: Via[] = []
  const padOffset = padGap / 2 + padWidth / 2
  const xStart = -((cols - 1) * pitchX) / 2
  const yStart = -((rows - 1) * pitchY) / 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const center = {
        x: xStart + col * pitchX,
        y: yStart + row * pitchY,
      }

      const pad1: Point =
        orientation === "horizontal"
          ? { x: center.x - padOffset, y: center.y }
          : { x: center.x, y: center.y - padOffset }
      const pad2: Point =
        orientation === "horizontal"
          ? { x: center.x + padOffset, y: center.y }
          : { x: center.x, y: center.y + padOffset }

      const jumperId = `jumper_r${row}_c${col}`

      jumpers.push({
        jumperId,
        center,
        orientation,
        padCenters: [pad1, pad2],
      })

      vias.push(
        { center: pad1, diameter: viaDiameter },
        { center: pad2, diameter: viaDiameter },
      )
    }
  }

  const bounds: Bounds = {
    minX: xStart - padOffset - padWidth / 2 - boundsPadding,
    maxX:
      xStart + (cols - 1) * pitchX + padOffset + padWidth / 2 + boundsPadding,
    minY: yStart - padOffset - padHeight / 2 - boundsPadding,
    maxY:
      yStart + (rows - 1) * pitchY + padOffset + padHeight / 2 + boundsPadding,
  }

  const convex = computeConvexRegions({
    bounds,
    vias,
    clearance,
    concavityTolerance,
  })

  const topLayerRegions: JRegion[] = convex.regions.map((polygon, index) => {
    const b = toBounds(polygon)
    return {
      regionId: `top_${index}`,
      ports: [],
      d: {
        bounds: b,
        center: toCenter(b),
        polygon,
        isPad: false,
      },
    }
  })

  const jumperRegions: JRegion[] = jumpers.map((jumper) => {
    const [p1, p2] = jumper.padCenters
    const b =
      orientation === "horizontal"
        ? {
            minX: p1.x - padWidth / 2,
            maxX: p2.x + padWidth / 2,
            minY: jumper.center.y - padHeight / 2,
            maxY: jumper.center.y + padHeight / 2,
          }
        : {
            minX: jumper.center.x - padHeight / 2,
            maxX: jumper.center.x + padHeight / 2,
            minY: p1.y - padWidth / 2,
            maxY: p2.y + padWidth / 2,
          }

    return {
      regionId: jumper.jumperId,
      ports: [],
      d: {
        bounds: b,
        center: jumper.center,
        polygon: boundsToPolygon(b),
        isPad: true,
        isThroughJumper: true,
      },
    }
  })

  const topLayerPorts = createTopLayerPorts(topLayerRegions)

  const jumperPorts: JPort[] = []
  let nextJumperPort = 0
  for (let i = 0; i < jumpers.length; i++) {
    const jumper = jumpers[i]
    const jumperRegion = jumperRegions[i]
    if (!jumper || !jumperRegion) continue

    for (const padCenter of jumper.padCenters) {
      const nearestTopRegion = getClosestTopLayerRegion(
        topLayerRegions,
        padCenter,
      )
      jumperPorts.push({
        portId: `jp_${nextJumperPort++}`,
        region1: jumperRegion,
        region2: nearestTopRegion,
        d: {
          x: padCenter.x,
          y: padCenter.y,
        },
      })
    }
  }

  const ports = [...topLayerPorts, ...jumperPorts]
  for (const port of ports) {
    port.region1.ports.push(port)
    port.region2.ports.push(port)
  }

  const graph: JumperHyperGraph = {
    regions: [...topLayerRegions, ...jumperRegions],
    ports,
    jumperLocations: jumpers.map((j, i) => ({
      center: j.center,
      orientation: j.orientation,
      padRegions: [jumperRegions[i]].filter(Boolean) as JRegion[],
    })),
    topLayerRegions,
    jumperRegions,
    jumpers,
    vias,
    bounds,
  }

  return graph
}

export const visualizeJumperHyperGraph = (
  graph: JumperHyperGraph,
): GraphicsObject => {
  const topPolygons = graph.topLayerRegions
    .map((region) => region.d.polygon)
    .filter((polygon): polygon is Point[] => Array.isArray(polygon))

  const jumperPolygons = graph.jumperRegions
    .map((region) => region.d.polygon)
    .filter((polygon): polygon is Point[] => Array.isArray(polygon))

  return {
    title: "0603 Jumper HyperGraph Topology",
    polygons: [
      ...topPolygons.map((points, i) => ({
        points,
        fill: "rgba(87, 164, 255, 0.15)",
        stroke: "#2f78bd",
        strokeWidth: 0.04,
        label: `top_${i}`,
      })),
      ...jumperPolygons.map((points, i) => ({
        points,
        fill: "rgba(255, 167, 38, 0.22)",
        stroke: "#cf6a00",
        strokeWidth: 0.06,
        label: `jumper_${i}`,
      })),
    ],
    circles: graph.vias.map((via) => ({
      center: via.center,
      radius: via.diameter / 2,
      fill: "rgba(178, 178, 178, 0.5)",
      stroke: "#6e6e6e",
      label: "pad-as-via",
    })),
    points: graph.ports.map((port) => ({
      x: port.d.x,
      y: port.d.y,
      color: "#1f1f1f",
      label: port.portId,
    })),
    rects: [
      {
        center: {
          x: (graph.bounds.minX + graph.bounds.maxX) / 2,
          y: (graph.bounds.minY + graph.bounds.maxY) / 2,
        },
        width: graph.bounds.maxX - graph.bounds.minX,
        height: graph.bounds.maxY - graph.bounds.minY,
        stroke: "#6f6f6f",
      },
    ],
  }
}
