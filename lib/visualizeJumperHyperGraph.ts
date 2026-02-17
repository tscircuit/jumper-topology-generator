import type { Point } from "@tscircuit/find-convex-regions"
import type { GraphicsObject } from "graphics-debug"
import type { JumperHyperGraph } from "./types"

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
      ...topPolygons.map((points, index) => ({
        points,
        fill: "rgba(87, 164, 255, 0.15)",
        stroke: "#2f78bd",
        strokeWidth: 0.04,
        label: `top_${index}`,
      })),
      ...jumperPolygons.map((points, index) => ({
        points,
        fill: "rgba(255, 167, 38, 0.22)",
        stroke: "#cf6a00",
        strokeWidth: 0.06,
        label: `jumper_${index}`,
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
