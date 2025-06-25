import { type FieldConfigNested, FieldType } from "~/composables/project/model/project"

export function isMultiLevelNested(fieldNested: FieldConfigNested): boolean {
  for (const field of fieldNested.fields) {
    if (field.type === FieldType.NESTED) {
      return true
    }
  }

  return false
}
