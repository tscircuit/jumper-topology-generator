import { JumperTopologyPlayground } from "./JumperTopologyPlayground"

export default (
  <JumperTopologyPlayground
    title="0603 Grid - Horizontal"
    initialOptions={{
      rows: 2,
      cols: 3,
      pattern: "grid",
      orientation: "horizontal",
      colSpacing: 2.4,
      rowSpacing: 1.8,
      portSpacing: 0.2,
      concavityTolerance: 0.2,
    }}
  />
)
