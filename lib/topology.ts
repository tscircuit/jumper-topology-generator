import type { Point } from "@tscircuit/find-convex-regions"
import type { JPort, JRegion } from "@tscircuit/hypergraph"
import {
  avgPoint,
  boundsToPolygon,
  distSquared,
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
        d: {
          x: sharedMidpoint.x,
          y: sharedMidpoint.y,
        },
      })
    }
  }

  return ports
}

const getClosestTopLayerRegion = (
  topLayerRegions: JRegion[],
  point: Point,
): JRegion => {
  const initial = topLayerRegions[0]
  if (!initial) {
    throw new Error("No top-layer regions were generated")
  }

  let closest = initial
  let closestScore = Number.POSITIVE_INFINITY

  for (const region of topLayerRegions) {
    const score = distSquared(region.d.center, point)
    if (score < closestScore) {
      closest = region
      closestScore = score
    }
  }

  return closest
}

export const createJumperPorts = (
  jumpers: JumperPlacement[],
  jumperRegions: JRegion[],
  topLayerRegions: JRegion[],
): JPort[] => {
  const ports: JPort[] = []
  let nextPort = 0

  for (let i = 0; i < jumpers.length; i++) {
    const jumper = jumpers[i]
    const jumperRegion = jumperRegions[i]
    if (!jumper || !jumperRegion) continue

    for (const padCenter of jumper.padCenters) {
      const nearestTopLayerRegion = getClosestTopLayerRegion(
        topLayerRegions,
        padCenter,
      )
      ports.push({
        portId: `jp_${nextPort++}`,
        region1: jumperRegion,
        region2: nearestTopLayerRegion,
        d: {
          x: padCenter.x,
          y: padCenter.y,
        },
      })
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
