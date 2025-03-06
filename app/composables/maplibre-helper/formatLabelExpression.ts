import type { ExpressionSpecification } from "maplibre-gl"

export function formatLabelExpression(x: string[]) {
  return ["concat", ...x.flatMap((col) => [["get", col], "\n"] as unknown as ExpressionSpecification).slice(0, -1)] as ExpressionSpecification
}
