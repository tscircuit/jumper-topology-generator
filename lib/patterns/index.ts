import type { JumperPatternResult, Resolved0603GridOptions } from "../types"
import { generate0603GridPattern } from "./grid0603"
import { generate0603StaggeredPattern } from "./staggered0603"

export const generate0603Pattern = (
  options: Resolved0603GridOptions,
): JumperPatternResult => {
  if (options.pattern === "staggered") {
    return generate0603StaggeredPattern(options)
  }

  return generate0603GridPattern(options)
}
