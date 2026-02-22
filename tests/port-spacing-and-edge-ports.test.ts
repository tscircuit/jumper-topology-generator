import { expect, test } from "bun:test"
import type { Point } from "@tscircuit/find-convex-regions"
import type { JRegion } from "@tscircuit/hypergraph"
import { generate0603JumperHyperGraph } from "../lib/index"

type Segment = {
  start: Point
  end: Point
}

const tolerance = 1e-5

const almostEqual = (a: number, b: number): boolean =>
  Math.abs(a - b) <= tolerance

const pointsEqual = (a: Point, b: Point): boolean =>
  almostEqual(a.x, b.x) && almostEqual(a.y, b.y)

const pointOnSegment = (point: Point, segment: Segment): boolean => {
  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const px = point.x - segment.start.x
  const py = point.y - segment.start.y

  const cross = dx * py - dy * px
  if (!almostEqual(cross, 0)) return false

  const dot = px * dx + py * dy
  if (dot < -tolerance) return false

  const lenSq = dx * dx + dy * dy
  if (dot > lenSq + tolerance) return false

  return true
}

const segmentsEqual = (a: Segment, b: Segment): boolean =>
  (pointsEqual(a.start, b.start) && pointsEqual(a.end, b.end)) ||
  (pointsEqual(a.start, b.end) && pointsEqual(a.end, b.start))

const getCollinearOverlap = (a: Segment, b: Segment): Segment | null => {
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
  if (!almostEqual(crossAB, 0)) return null

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
  if (!almostEqual(crossStart, 0) || !almostEqual(crossEnd, 0)) return null

  const tBStart = (bStartOffset.x * av.x + bStartOffset.y * av.y) / aLenSq
  const tBEnd = (bEndOffset.x * av.x + bEndOffset.y * av.y) / aLenSq
  const overlapStart = Math.max(0, Math.min(tBStart, tBEnd))
  const overlapEnd = Math.min(1, Math.max(tBStart, tBEnd))
  const minParamLength = tolerance / Math.sqrt(aLenSq)
  if (overlapEnd - overlapStart <= minParamLength) return null

  return {
    start: {
      x: a.start.x + (a.end.x - a.start.x) * overlapStart,
      y: a.start.y + (a.end.y - a.start.y) * overlapStart,
    },
    end: {
      x: a.start.x + (a.end.x - a.start.x) * overlapEnd,
      y: a.start.y + (a.end.y - a.start.y) * overlapEnd,
    },
  }
}

const getSharedBoundaryEdges = (a: JRegion, b: JRegion): Segment[] => {
  const edges: Segment[] = []
  if (!a.d.polygon || !b.d.polygon) return edges

  for (let ai = 0; ai < a.d.polygon.length; ai++) {
    const a1 = a.d.polygon[ai]
    const a2 = a.d.polygon[(ai + 1) % a.d.polygon.length]
    if (!a1 || !a2) continue

    for (let bi = 0; bi < b.d.polygon.length; bi++) {
      const b1 = b.d.polygon[bi]
      const b2 = b.d.polygon[(bi + 1) % b.d.polygon.length]
      if (!b1 || !b2) continue

      const overlap = getCollinearOverlap(
        { start: a1, end: a2 },
        { start: b1, end: b2 },
      )
      if (!overlap) continue
      if (edges.some((edge) => segmentsEqual(edge, overlap))) continue
      edges.push(overlap)
    }
  }

  return edges
}

const mergePairIfCollinearAndTouching = (
  a: Segment,
  b: Segment,
): Segment | null => {
  const av = {
    x: a.end.x - a.start.x,
    y: a.end.y - a.start.y,
  }
  const aLenSq = av.x ** 2 + av.y ** 2
  if (aLenSq <= tolerance ** 2) return null

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
  if (!almostEqual(crossStart, 0) || !almostEqual(crossEnd, 0)) return null

  const tBStart = (bStartOffset.x * av.x + bStartOffset.y * av.y) / aLenSq
  const tBEnd = (bEndOffset.x * av.x + bEndOffset.y * av.y) / aLenSq
  const bMin = Math.min(tBStart, tBEnd)
  const bMax = Math.max(tBStart, tBEnd)
  const tolParam = tolerance / Math.sqrt(aLenSq)
  if (Math.max(0, bMin) > Math.min(1, bMax) + tolParam) return null

  const start = Math.min(0, bMin)
  const end = Math.max(1, bMax)
  return {
    start: {
      x: a.start.x + (a.end.x - a.start.x) * start,
      y: a.start.y + (a.end.y - a.start.y) * start,
    },
    end: {
      x: a.start.x + (a.end.x - a.start.x) * end,
      y: a.start.y + (a.end.y - a.start.y) * end,
    },
  }
}

const mergeCollinearTouchingSegments = (segments: Segment[]): Segment[] => {
  const merged = [...segments]
  let didMerge = true

  while (didMerge) {
    didMerge = false
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i]
        const b = merged[j]
        if (!a || !b) continue

        const combined = mergePairIfCollinearAndTouching(a, b)
        if (!combined) continue

        merged[i] = combined
        merged.splice(j, 1)
        didMerge = true
        break
      }
      if (didMerge) break
    }
  }

  return merged
}

const segmentMidpoint = (segment: Segment): Point => ({
  x: (segment.start.x + segment.end.x) / 2,
  y: (segment.start.y + segment.end.y) / 2,
})

test("smaller portSpacing creates more top-layer edge ports", () => {
  const sparse = generate0603JumperHyperGraph({
    cols: 3,
    rows: 2,
    orientation: "horizontal",
    portSpacing: 2,
  })
  const dense = generate0603JumperHyperGraph({
    cols: 3,
    rows: 2,
    orientation: "horizontal",
    portSpacing: 0.4,
  })

  const sparseTopLayerPorts = sparse.ports.filter((p) =>
    p.portId.startsWith("tp_"),
  )
  const denseTopLayerPorts = dense.ports.filter((p) =>
    p.portId.startsWith("tp_"),
  )

  expect(denseTopLayerPorts.length).toBeGreaterThan(sparseTopLayerPorts.length)
})

test("ports are only placed on shared edges and jumpers have one port per touched top region", () => {
  const graph = generate0603JumperHyperGraph({
    cols: 2,
    rows: 2,
    orientation: "vertical",
    portSpacing: 0.75,
  })

  for (const port of graph.ports) {
    const sharedEdges = getSharedBoundaryEdges(port.region1, port.region2)
    expect(sharedEdges.length).toBeGreaterThan(0)

    const onSharedEdge = sharedEdges.some((edge) =>
      pointOnSegment({ x: port.d.x, y: port.d.y }, edge),
    )
    expect(onSharedEdge).toBe(true)
  }

  const jumperEdgePortCount = new Map<string, number>()
  for (const port of graph.ports.filter((p) => p.portId.startsWith("jp_"))) {
    const key = `${port.region1.regionId}::${port.region2.regionId}`
    jumperEdgePortCount.set(key, (jumperEdgePortCount.get(key) ?? 0) + 1)

    const mergedEdges = mergeCollinearTouchingSegments(
      getSharedBoundaryEdges(port.region1, port.region2),
    )
    const longest = mergedEdges.reduce((best, edge) => {
      const bestLength = Math.hypot(
        best.end.x - best.start.x,
        best.end.y - best.start.y,
      )
      const edgeLength = Math.hypot(
        edge.end.x - edge.start.x,
        edge.end.y - edge.start.y,
      )
      return edgeLength > bestLength ? edge : best
    })
    const midpoint = segmentMidpoint(longest)
    expect(pointsEqual({ x: port.d.x, y: port.d.y }, midpoint)).toBe(true)
  }

  for (const jumperRegion of graph.jumperRegions) {
    for (const topRegion of graph.topLayerRegions) {
      const sharedEdges = getSharedBoundaryEdges(jumperRegion, topRegion)
      if (sharedEdges.length === 0) continue

      const key = `${jumperRegion.regionId}::${topRegion.regionId}`
      const actualPortCount = jumperEdgePortCount.get(key) ?? 0
      expect(actualPortCount).toBe(1)
    }
  }
})
