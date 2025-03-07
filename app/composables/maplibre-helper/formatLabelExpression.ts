import type { ExpressionSpecification } from "maplibre-gl"

export function formatLabelExpression(labelField: string[]) {
  return ["concat", ...labelField.flatMap((field) => [["get", field], "\n"] as unknown as ExpressionSpecification).slice(0, -1)] as ExpressionSpecification
}
