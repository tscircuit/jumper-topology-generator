import { InteractiveGraphics } from "graphics-debug/react"
import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import {
  type Generate0603JumperHyperGraphOptions,
  generate0603JumperHyperGraph,
  type JumperOrientation,
  type JumperPatternName,
  type StaggerAxis,
  visualizeJumperHyperGraph,
} from "../lib"

interface JumperTopologyPlaygroundProps {
  title: string
  initialOptions: Generate0603JumperHyperGraphOptions
}

const controlGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
  marginBottom: 12,
}

const panelStyle: CSSProperties = {
  padding: 12,
  border: "1px solid #dadada",
  borderRadius: 8,
  marginBottom: 12,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
}

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: 4,
}

const labelStyle: CSSProperties = {
  fontSize: 12,
  display: "block",
}

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  return fallback
}

const parsePositiveInteger = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return fallback
}

export const JumperTopologyPlayground = ({
  title,
  initialOptions,
}: JumperTopologyPlaygroundProps) => {
  const [options, setOptions] = useState(initialOptions)

  const result = useMemo(() => {
    try {
      const graph = generate0603JumperHyperGraph(options)
      return { graphics: visualizeJumperHyperGraph(graph), error: "" }
    } catch (error) {
      return {
        graphics: undefined,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }, [options])

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: "0 0 12px" }}>{title}</h3>

      <div style={panelStyle}>
        <div style={controlGridStyle}>
          <label style={labelStyle}>
            Rows
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={options.rows}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  rows: parsePositiveInteger(
                    (event.target as any).value,
                    prev.rows,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Columns
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={options.cols}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  cols: parsePositiveInteger(
                    (event.target as any).value,
                    prev.cols,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Pattern
            <select
              style={inputStyle}
              value={options.pattern ?? "grid"}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  pattern: (event.target as any).value as JumperPatternName,
                }))
              }
            >
              <option value="grid">grid</option>
              <option value="staggered">staggered</option>
            </select>
          </label>

          <label style={labelStyle}>
            Orientation
            <select
              style={inputStyle}
              value={options.orientation ?? "horizontal"}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  orientation: (event.target as any).value as JumperOrientation,
                }))
              }
            >
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
          </label>

          <label style={labelStyle}>
            Stagger Axis
            <select
              style={inputStyle}
              value={options.staggerAxis ?? "x"}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  staggerAxis: (event.target as any).value as StaggerAxis,
                }))
              }
            >
              <option value="x">x</option>
              <option value="y">y</option>
            </select>
          </label>

          <label style={labelStyle}>
            Stagger Offset
            <input
              style={inputStyle}
              type="number"
              step="0.1"
              value={options.staggerOffset ?? 0}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  staggerOffset: parseNumber(
                    (event.target as any).value,
                    prev.staggerOffset ?? 0,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Column Spacing
            <input
              style={inputStyle}
              type="number"
              step="0.1"
              value={options.colSpacing ?? 2.4}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  colSpacing: parseNumber(
                    (event.target as any).value,
                    prev.colSpacing ?? 2.4,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Row Spacing
            <input
              style={inputStyle}
              type="number"
              step="0.1"
              value={options.rowSpacing ?? 1.8}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  rowSpacing: parseNumber(
                    (event.target as any).value,
                    prev.rowSpacing ?? 1.8,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Port Spacing
            <input
              style={inputStyle}
              type="number"
              step="0.02"
              value={options.portSpacing ?? 0.2}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  portSpacing: parseNumber(
                    (event.target as any).value,
                    prev.portSpacing ?? 0.2,
                  ),
                }))
              }
            />
          </label>

          <label style={labelStyle}>
            Concavity Tolerance
            <input
              style={inputStyle}
              type="number"
              step="0.05"
              value={options.concavityTolerance ?? 0.2}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  concavityTolerance: parseNumber(
                    (event.target as any).value,
                    prev.concavityTolerance ?? 0.2,
                  ),
                }))
              }
            />
          </label>
        </div>
      </div>

      {result.error ? (
        <pre
          style={{
            color: "#9f1239",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: 8,
            padding: 10,
          }}
        >
          {result.error}
        </pre>
      ) : (
        result.graphics && <InteractiveGraphics graphics={result.graphics} />
      )}
    </div>
  )
}
