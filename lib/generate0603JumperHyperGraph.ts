import { ConvexRegionsSolver, type Rect } from "@tscircuit/find-convex-regions"
import { generate0603Pattern } from "./patterns"
import { resolve0603GridOptions } from "./patterns/grid0603"
import {
  attachPortsToRegions,
  createJumperPorts,
  createJumperRegions,
  createTopLayerPorts,
  createTopLayerRegions,
} from "./topology"
import type {
  Generate0603JumperHyperGraphOptions,
  JumperHyperGraph,
} from "./types"

export const generate0603JumperHyperGraph = (
  input: Generate0603JumperHyperGraphOptions,
): JumperHyperGraph => {
  const options = resolve0603GridOptions(input)
  const pattern = generate0603Pattern(options)
  const padWidth =
    options.orientation === "horizontal" ? options.padWidth : options.padHeight
  const padHeight =
    options.orientation === "horizontal" ? options.padHeight : options.padWidth

  const rects: Rect[] = pattern.jumpers.flatMap((jumper) =>
    jumper.padCenters.map((center) => ({
      center,
      width: padWidth,
      height: padHeight,
      ccwRotation: 0,
    })),
  )

  const convexSolver = new ConvexRegionsSolver({
    bounds: pattern.bounds,
    rects,
    clearance: 0,
    concavityTolerance: options.concavityTolerance,
  })
  convexSolver.solve()
  const convex = convexSolver.getOutput()

  if (!convex) {
    throw new Error(convexSolver.error ?? "ConvexRegionsSolver failed")
  }

  const topLayerRegions = createTopLayerRegions(convex.regions)
  const jumperRegions = createJumperRegions(pattern.jumpers, {
    orientation: options.orientation,
    padWidth: options.padWidth,
    padHeight: options.padHeight,
  })

  const topLayerPorts = createTopLayerPorts(
    topLayerRegions,
    options.portSpacing,
  )
  const jumperPorts = createJumperPorts(jumperRegions, topLayerRegions)
  const ports = [...topLayerPorts, ...jumperPorts]

  attachPortsToRegions(ports)

  return {
    regions: [...topLayerRegions, ...jumperRegions],
    ports,
    jumperLocations: pattern.jumpers.map((jumper, index) => ({
      center: jumper.center,
      orientation: jumper.orientation,
      padRegions: [jumperRegions[index]].filter(
        (region): region is NonNullable<typeof region> => Boolean(region),
      ),
    })),
    topLayerRegions,
    jumperRegions,
    jumpers: pattern.jumpers,
    vias: pattern.vias,
    bounds: pattern.bounds,
  }
}
