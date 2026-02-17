import type { Point } from "@tscircuit/find-convex-regions"
import type { JPort, JRegion } from "@tscircuit/hypergraph"
import {
  almostEqual,
  boundsToPolygon,
  pointsEqual,
  toBounds,
  toCenter,
} from "./geometry"
import type { JumperPlacement, Resolved0603GridOptions } from "./types"

export const createTopLayerRegions = (convexRegions: Point[][]): JRegion[] =>
  convexRegions.map((polygon, index) => {
    const bounds = toBounds(polygon)
    return {
      regionId: `top_${index}`,
      ports: [],
      d: {
        bounds,
        center: toCenter(bounds),
        polygon,
        isPad: false,
      },
    }
  })

export const createJumperRegions = (
  jumpers: JumperPlacement[],
  options: Pick<
    Resolved0603GridOptions,
    "orientation" | "padWidth" | "padHeight"
  >,
): JRegion[] =>
  jumpers.map((jumper) => {
    const [p1, p2] = jumper.padCenters
    const bounds =
      options.orientation === "horizontal"
        ? {
            minX: p1.x - options.padWidth / 2,
            maxX: p2.x + options.padWidth / 2,
            minY: jumper.center.y - options.padHeight / 2,
            maxY: jumper.center.y + options.padHeight / 2,
          }
        : {
            minX: jumper.center.x - options.padHeight / 2,
            maxX: jumper.center.x + options.padHeight / 2,
            minY: p1.y - options.padWidth / 2,
            maxY: p2.y + options.padWidth / 2,
          }

    return {
      regionId: jumper.jumperId,
      ports: [],
      d: {
        bounds,
        center: jumper.center,
        polygon: boundsToPolygon(bounds),
        isPad: true,
        isThroughJumper: true,
      },
    }
  })

export const createTopLayerPorts = (
  topLayerRegions: JRegion[],
  portSpacing: number,
  tolerance = 1e-5,
): JPort[] => {
  const ports: JPort[] = []
  let nextPort = 0

  for (let i = 0; i < topLayerRegions.length; i++) {
    const regionA = topLayerRegions[i]
    if (!regionA?.d.polygon) continue

    for (let j = i + 1; j < topLayerRegions.length; j++) {
      const regionB = topLayerRegions[j]
      if (!regionB?.d.polygon) continue

      const sharedEdges = getSharedBoundaryEdges(regionA, regionB, tolerance)
      for (const edge of sharedEdges) {
        const edgeLength = getSegmentLength(edge)
        const intervalCount = Math.floor(edgeLength / portSpacing)
        const portCount = intervalCount - 1
        if (portCount < 1) continue

        for (let k = 0; k < portCount; k++) {
          const t = (k + 1) / (portCount + 1)
          const point = pointAlongSegment(edge, t)

          ports.push({
            portId: `tp_${nextPort++}`,
            region1: regionA,
            region2: regionB,
            d: {
              x: point.x,
              y: point.y,
            },
          })
        }
      }
    }
  }

  return ports
}

type Segment = {
  start: Point
  end: Point
}

const getSegmentLength = (segment: Segment): number => {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  return Math.hypot(dx, dy)
}

const pointAlongSegment = (segment: Segment, t: number): Point => ({
  x: segment.start.x + (segment.end.x - segment.start.x) * t,
  y: segment.start.y + (segment.end.y - segment.start.y) * t,
})

const getSharedBoundaryEdges = (
  regionA: JRegion,
  regionB: JRegion,
  tolerance: number,
): Segment[] => {
  const edges: Segment[] = []
  if (!regionA.d.polygon || !regionB.d.polygon) return edges

  for (let ai = 0; ai < regionA.d.polygon.length; ai++) {
    const a1 = regionA.d.polygon[ai]
    const a2 = regionA.d.polygon[(ai + 1) % regionA.d.polygon.length]
    if (!a1 || !a2) continue

    for (let bi = 0; bi < regionB.d.polygon.length; bi++) {
      const b1 = regionB.d.polygon[bi]
      const b2 = regionB.d.polygon[(bi + 1) % regionB.d.polygon.length]
      if (!b1 || !b2) continue

      const overlap = getCollinearOverlap(
        { start: a1, end: a2 },
        { start: b1, end: b2 },
        tolerance,
      )
      if (!overlap) continue

      const alreadyPresent = edges.some((edge) =>
        segmentsEqual(edge, overlap, tolerance),
      )
      if (!alreadyPresent) {
        edges.push(overlap)
      }
    }
  }

  return edges
}

const segmentsEqual = (a: Segment, b: Segment, tolerance: number): boolean =>
  (pointsEqual(a.start, b.start, tolerance) &&
    pointsEqual(a.end, b.end, tolerance)) ||
  (pointsEqual(a.start, b.end, tolerance) &&
    pointsEqual(a.end, b.start, tolerance))

const getCollinearOverlap = (
  a: Segment,
  b: Segment,
  tolerance: number,
): Segment | null => {
  const av = {
    x: a.end.x - a.start.x,
    y: a.end.y - a.start.y,
  }
  const bv = {
    x: b.end.x - b.start.x,
    y: b.end.y - b.start.y,
  }
  const aLenSq = av.x ** 2 + av.y ** 2
  if (aLenSq <= tolerance ** 2) return null

  const crossAB = av.x * bv.y - av.y * bv.x
  if (!almostEqual(crossAB, 0, tolerance)) return null

  const bStartOffset = {
    x: b.start.x - a.start.x,
    y: b.start.y - a.start.y,
  }
  const bEndOffset = {
    x: b.end.x - a.start.x,
    y: b.end.y - a.start.y,
  }
  const crossStart = av.x * bStartOffset.y - av.y * bStartOffset.x
  const crossEnd = av.x * bEndOffset.y - av.y * bEndOffset.x
  if (
    !almostEqual(crossStart, 0, tolerance) ||
    !almostEqual(crossEnd, 0, tolerance)
  ) {
    return null
  }

  const tBStart = (bStartOffset.x * av.x + bStartOffset.y * av.y) / aLenSq
  const tBEnd = (bEndOffset.x * av.x + bEndOffset.y * av.y) / aLenSq
  const overlapStart = Math.max(0, Math.min(tBStart, tBEnd))
  const overlapEnd = Math.min(1, Math.max(tBStart, tBEnd))
  const minParamLength = tolerance / Math.sqrt(aLenSq)

  if (overlapEnd - overlapStart <= minParamLength) return null

  return {
    start: pointAlongSegment(a, overlapStart),
    end: pointAlongSegment(a, overlapEnd),
  }
}

export const createJumperPorts = (
  jumperRegions: JRegion[],
  topLayerRegions: JRegion[],
  tolerance = 1e-5,
): JPort[] => {
  const ports: JPort[] = []
  let nextPort = 0

  for (const jumperRegion of jumperRegions) {
    for (const topRegion of topLayerRegions) {
      const sharedEdges = getSharedBoundaryEdges(
        jumperRegion,
        topRegion,
        tolerance,
      )
      for (const edge of sharedEdges) {
        const midpoint = pointAlongSegment(edge, 0.5)
        ports.push({
          portId: `jp_${nextPort++}`,
          region1: jumperRegion,
          region2: topRegion,
          d: {
            x: midpoint.x,
            y: midpoint.y,
          },
        })
      }
    }
  }

  return ports
}

export const attachPortsToRegions = (ports: JPort[]): void => {
  for (const port of ports) {
    port.region1.ports.push(port)
    port.region2.ports.push(port)
  }
}
