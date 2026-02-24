import type { Point } from "@tscircuit/find-convex-regions"

type Triangle = [number, number, number]

export interface ChokepointEliminationOptions {
  maxNeckRatio: number
  minSplitBalanceRatio: number
  maxSplitsPerRegion?: number
}

const EPSILON = 1e-9

export const splitPolygonsOnChokepoints = (
  polygons: Point[][],
  options: ChokepointEliminationOptions,
): Point[][] => {
  if (options.maxNeckRatio <= 0) return polygons

  const output: Point[][] = []
  for (const polygon of polygons) {
    output.push(...splitPolygonRecursively(polygon, options))
  }
  return output
}

const splitPolygonRecursively = (
  polygon: Point[],
  options: ChokepointEliminationOptions,
): Point[][] => {
  const work: Point[][] = [normalizePolygon(polygon)]
  const result: Point[][] = []
  let remainingSplits = options.maxSplitsPerRegion ?? 32

  while (work.length > 0) {
    const current = work.pop()
    if (!current) continue

    if (current.length < 4) {
      result.push(current)
      continue
    }

    const candidate = findBestSeparator(current, options)
    if (!candidate || remainingSplits <= 0) {
      result.push(current)
      continue
    }

    const [a, b] = splitPolygonByChord(current, candidate.i, candidate.j)
    remainingSplits -= 1
    work.push(a, b)
  }

  return result
}

const findBestSeparator = (
  polygon: Point[],
  options: ChokepointEliminationOptions,
): { i: number; j: number } | null => {
  const triangulation = triangulatePolygon(polygon)
  if (!triangulation) return null

  const { triangles } = triangulation
  const totalArea = polygonAreaAbs(polygon)
  if (totalArea <= EPSILON) return null
  const scale = Math.sqrt(totalArea)

  const triangleAreas = triangles.map((triangle) =>
    triangleAreaAbs(
      polygon[triangle[0]] as Point,
      polygon[triangle[1]] as Point,
      polygon[triangle[2]] as Point,
    ),
  )

  let best: {
    i: number
    j: number
    score: number
  } | null = null

  for (const internalEdge of triangulation.internalEdges) {
    const { i, j, triA, triB } = internalEdge
    const neckWidth = segmentLength(polygon[i] as Point, polygon[j] as Point)
    const neckRatio = neckWidth / scale
    if (neckRatio > options.maxNeckRatio) continue

    const sideArea = areaOnSide(
      triA,
      triB,
      triangles.length,
      triangulation.triangleAdjacency,
      triangleAreas,
    )
    const otherSideArea = totalArea - sideArea
    const balance = Math.min(sideArea, otherSideArea) / totalArea
    if (balance < options.minSplitBalanceRatio) continue

    const score = neckRatio / Math.max(balance, EPSILON)
    if (!best || score < best.score) {
      best = { i, j, score }
    }
  }

  if (!best) return null
  return { i: best.i, j: best.j }
}

const areaOnSide = (
  startTriangle: number,
  blockedTriangle: number,
  triangleCount: number,
  adjacency: number[][],
  triangleAreas: number[],
): number => {
  const visited = new Array<boolean>(triangleCount).fill(false)
  const stack = [startTriangle]
  visited[blockedTriangle] = true

  let total = 0
  while (stack.length > 0) {
    const tri = stack.pop()
    if (tri === undefined || visited[tri]) continue
    visited[tri] = true
    total += triangleAreas[tri] ?? 0

    const neighbors = adjacency[tri] ?? []
    for (const neighbor of neighbors) {
      if (!visited[neighbor]) {
        stack.push(neighbor)
      }
    }
  }

  return total
}

const splitPolygonByChord = (
  polygon: Point[],
  i: number,
  j: number,
): [Point[], Point[]] => {
  const first = walkPolygon(polygon, i, j)
  const second = walkPolygon(polygon, j, i)
  return [first, second]
}

const walkPolygon = (polygon: Point[], start: number, end: number): Point[] => {
  const points: Point[] = []
  const n = polygon.length
  let idx = start

  points.push(polygon[idx] as Point)
  while (idx !== end) {
    idx = (idx + 1) % n
    points.push(polygon[idx] as Point)
  }

  return normalizePolygon(points)
}

const triangulatePolygon = (
  polygon: Point[],
): {
  triangles: Triangle[]
  internalEdges: Array<{ i: number; j: number; triA: number; triB: number }>
  triangleAdjacency: number[][]
} | null => {
  const n = polygon.length
  if (n < 3) return null

  const boundaryEdges = new Set<string>()
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    boundaryEdges.add(edgeKey(i, j))
  }

  const triangles = earClipTriangulate(polygon)
  if (!triangles || triangles.length === 0) return null

  const edgeToTriangles = new Map<string, number[]>()
  triangles.forEach((triangle, triIndex) => {
    for (let e = 0; e < 3; e++) {
      const a = triangle[e] as number
      const b = triangle[(e + 1) % 3] as number
      const key = edgeKey(a, b)
      const hits = edgeToTriangles.get(key)
      if (hits) {
        hits.push(triIndex)
      } else {
        edgeToTriangles.set(key, [triIndex])
      }
    }
  })

  const triangleAdjacency: number[][] = Array.from(
    { length: triangles.length },
    () => [],
  )
  const internalEdges: Array<{
    i: number
    j: number
    triA: number
    triB: number
  }> = []

  for (const [key, triIndices] of edgeToTriangles.entries()) {
    if (boundaryEdges.has(key)) continue
    if (triIndices.length !== 2) continue

    const [aStr, bStr] = key.split("_")
    const i = Number(aStr)
    const j = Number(bStr)
    const triA = triIndices[0] as number
    const triB = triIndices[1] as number

    internalEdges.push({ i, j, triA, triB })
    const adjA = triangleAdjacency[triA]
    const adjB = triangleAdjacency[triB]
    if (adjA) adjA.push(triB)
    if (adjB) adjB.push(triA)
  }

  return { triangles, internalEdges, triangleAdjacency }
}

const earClipTriangulate = (polygon: Point[]): Triangle[] | null => {
  const n = polygon.length
  if (n < 3) return null

  const orientation = Math.sign(signedPolygonArea(polygon))
  if (orientation === 0) return null

  const indices = [...Array(n).keys()]
  if (orientation < 0) {
    indices.reverse()
  }

  const triangles: Triangle[] = []
  let guard = 0
  while (indices.length > 3 && guard < n * n) {
    let earFound = false

    for (let idx = 0; idx < indices.length; idx++) {
      const prev = indices[(idx - 1 + indices.length) % indices.length]
      const curr = indices[idx]
      const next = indices[(idx + 1) % indices.length]
      if (prev === undefined || curr === undefined || next === undefined)
        continue

      const a = polygon[prev]
      const b = polygon[curr]
      const c = polygon[next]
      if (!a || !b || !c) continue

      if (!isConvex(a, b, c)) continue

      let containsPoint = false
      for (const other of indices) {
        if (other === prev || other === curr || other === next) continue
        const p = polygon[other]
        if (!p) continue
        if (pointInTriangle(p, a, b, c)) {
          containsPoint = true
          break
        }
      }
      if (containsPoint) continue

      triangles.push([prev, curr, next])
      indices.splice(idx, 1)
      earFound = true
      break
    }

    if (!earFound) {
      return null
    }

    guard += 1
  }

  if (indices.length === 3) {
    const [a, b, c] = indices
    if (a !== undefined && b !== undefined && c !== undefined) {
      triangles.push([a, b, c])
    }
  }

  return triangles
}

const isConvex = (a: Point, b: Point, c: Point): boolean =>
  cross(a, b, c) > EPSILON

const pointInTriangle = (p: Point, a: Point, b: Point, c: Point): boolean => {
  const c1 = cross(a, b, p)
  const c2 = cross(b, c, p)
  const c3 = cross(c, a, p)
  return c1 >= -EPSILON && c2 >= -EPSILON && c3 >= -EPSILON
}

const cross = (a: Point, b: Point, c: Point): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

const signedPolygonArea = (polygon: Point[]): number => {
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    if (!a || !b) continue
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

const polygonAreaAbs = (polygon: Point[]): number =>
  Math.abs(signedPolygonArea(polygon))

const triangleAreaAbs = (a: Point, b: Point, c: Point): number =>
  Math.abs(cross(a, b, c)) / 2

const segmentLength = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

const edgeKey = (a: number, b: number): string =>
  a < b ? `${a}_${b}` : `${b}_${a}`

const normalizePolygon = (polygon: Point[]): Point[] => {
  if (polygon.length < 2) return polygon
  const first = polygon[0]
  const last = polygon[polygon.length - 1]
  if (!first || !last) return polygon
  if (first.x === last.x && first.y === last.y) {
    return polygon.slice(0, -1)
  }
  return polygon
}
