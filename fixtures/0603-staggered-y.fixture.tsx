import { JumperTopologyPlayground } from "./JumperTopologyPlayground"

export default (
  <JumperTopologyPlayground
    title="0603 Staggered Y"
    initialOptions={{
      rows: 3,
      cols: 3,
      pattern: "staggered",
      staggerAxis: "y",
      staggerOffset: 0.7,
      orientation: "vertical",
      colSpacing: 2.1,
      rowSpacing: 2.5,
      portSpacing: 0.2,
      concavityTolerance: 0.2,
    }}
  />
)
