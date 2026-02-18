import { JumperTopologyPlayground } from "./JumperTopologyPlayground"

export default (
  <JumperTopologyPlayground
    title="0603 Staggered X"
    initialOptions={{
      rows: 3,
      cols: 4,
      pattern: "staggered",
      staggerAxis: "x",
      staggerOffset: 1,
      orientation: "horizontal",
      colSpacing: 2.8,
      rowSpacing: 1.9,
      portSpacing: 0.2,
      concavityTolerance: 0.3,
    }}
  />
)
