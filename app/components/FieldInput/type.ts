import type { FieldConfigNested } from "~/composables/project/model/project"

export interface NestedItemValue {
  [key: string]: string | number | boolean | Date
}

export interface NestedEditValue {
  item?: NestedItemValue
  config: FieldConfigNested
  visible: boolean
  index?: number
  isMultiNested: boolean
}
