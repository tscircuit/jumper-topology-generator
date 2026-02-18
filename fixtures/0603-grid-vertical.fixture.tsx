import { JumperTopologyPlayground } from "./JumperTopologyPlayground"

export default (
  <JumperTopologyPlayground
    title="0603 Grid - Vertical"
    initialOptions={{
      rows: 2,
      cols: 2,
      pattern: "grid",
      orientation: "vertical",
      pitchX: 2.0,
      pitchY: 2.0,
      portSpacing: 0.2,
      concavityTolerance: 0.2,
    }}
  />
)
