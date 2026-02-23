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
  jumpers.flatMap((jumper) => {
    const [p1, p2] = jumper.padCenters
    const padXHalf =
      options.orientation === "horizontal"
        ? options.padWidth / 2
        : options.padHeight / 2
    const padYHalf =
      options.orientation === "horizontal"
        ? options.padHeight / 2
        : options.padWidth / 2

    const pad1Bounds = {
      minX: p1.x - padXHalf,
      maxX: p1.x + padXHalf,
      minY: p1.y - padYHalf,
      maxY: p1.y + padYHalf,
    }
    const pad2Bounds = {
      minX: p2.x - padXHalf,
      maxX: p2.x + padXHalf,
      minY: p2.y - padYHalf,
      maxY: p2.y + padYHalf,
    }
    const bridgeXHalf = padXHalf / 2
    const bridgeYHalf = padYHalf / 2
    const bridgeBounds =
      options.orientation === "horizontal"
        ? {
            minX: Math.min(p1.x, p2.x),
            maxX: Math.max(p1.x, p2.x),
            minY: jumper.center.y - bridgeYHalf,
            maxY: jumper.center.y + bridgeYHalf,
          }
        : {
            minX: jumper.center.x - bridgeXHalf,
            maxX: jumper.center.x + bridgeXHalf,
            minY: Math.min(p1.y, p2.y),
            maxY: Math.max(p1.y, p2.y),
          }

    return [
      {
        regionId: `${jumper.jumperId}_pad1`,
        ports: [],
        d: {
          bounds: pad1Bounds,
          center: p1,
          polygon: boundsToPolygon(pad1Bounds),
          isPad: true,
          isThroughJumper: false,
        },
      },
      {
        regionId: `${jumper.jumperId}_bridge`,
        ports: [],
        d: {
          bounds: bridgeBounds,
          center: jumper.center,
          polygon: boundsToPolygon(bridgeBounds),
          isPad: false,
          isThroughJumper: true,
        },
      },
      {
        regionId: `${jumper.jumperId}_pad2`,
        ports: [],
        d: {
          bounds: pad2Bounds,
          center: p2,
          polygon: boundsToPolygon(pad2Bounds),
          isPad: true,
          isThroughJumper: false,
        },
      },
    ]
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

        // Always at least one port
        const portCount = Math.max(1, intervalCount - 1)

        // if (portCount < 1) continue

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

const mergeCollinearConnectedSegments = (
  segments: Segment[],
  tolerance: number,
): Segment[] => {
  const merged: Segment[] = []

  for (const segment of segments) {
    let candidate = segment
    let didMerge = true

    while (didMerge) {
      didMerge = false

      for (let i = 0; i < merged.length; i++) {
        const existing = merged[i]
        if (!existing) continue

        const next = mergeTwoCollinearSegments(candidate, existing, tolerance)
        if (!next) continue

        candidate = next
        merged.splice(i, 1)
        didMerge = true
        break
      }
    }

    merged.push(candidate)
  }

  return merged
}

const mergeTwoCollinearSegments = (
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
  const bMin = Math.min(tBStart, tBEnd)
  const bMax = Math.max(tBStart, tBEnd)
  const minParamLength = tolerance / Math.sqrt(aLenSq)

  if (bMin > 1 + minParamLength || bMax < 0 - minParamLength) {
    return null
  }

  const mergedStart = Math.min(0, bMin)
  const mergedEnd = Math.max(1, bMax)

  return {
    start: pointAlongSegment(a, mergedStart),
    end: pointAlongSegment(a, mergedEnd),
  }
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
  let nextInternalPort = 0

  const padRegions = jumperRegions.filter((region) => region.d.isPad)
  const throughJumperRegions = jumperRegions.filter(
    (region) => region.d.isThroughJumper && !region.d.isPad,
  )

  for (const jumperRegion of padRegions) {
    for (const topRegion of topLayerRegions) {
      const sharedEdges = getSharedBoundaryEdges(
        jumperRegion,
        topRegion,
        tolerance,
      )
      const sharedSegments = mergeCollinearConnectedSegments(
        sharedEdges,
        tolerance,
      )

      for (const edge of sharedSegments) {
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

  for (const throughJumperRegion of throughJumperRegions) {
    for (const padRegion of padRegions) {
      const overlap = getBoundsOverlap(
        throughJumperRegion.d.bounds,
        padRegion.d.bounds,
        tolerance,
      )
      if (!overlap) continue

      const midpoint = toCenter(overlap)
      ports.push({
        portId: `jip_${nextInternalPort++}`,
        region1: padRegion,
        region2: throughJumperRegion,
        d: {
          x: midpoint.x,
          y: midpoint.y,
        },
      })
    }
  }

  return ports
}

const getBoundsOverlap = (
  a: JRegion["d"]["bounds"],
  b: JRegion["d"]["bounds"],
  tolerance: number,
): JRegion["d"]["bounds"] | null => {
  const minX = Math.max(a.minX, b.minX)
  const maxX = Math.min(a.maxX, b.maxX)
  const minY = Math.max(a.minY, b.minY)
  const maxY = Math.min(a.maxY, b.maxY)

  if (maxX < minX - tolerance || maxY < minY - tolerance) {
    return null
  }

  return { minX, maxX, minY, maxY }
}

export const attachPortsToRegions = (ports: JPort[]): void => {
  for (const port of ports) {
    port.region1.ports.push(port)
    port.region2.ports.push(port)
  }
}
