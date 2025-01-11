import type { FieldConfig, FieldConfigSingular } from "~/composables/project/model/project"

export interface FormConfig {
  title: string
  key: string
}

export type FieldConfigWrapper = FieldConfig & { dirty: boolean, strictChange: boolean }
export type FieldConfigSingularWrapper = FieldConfigSingular & { dirty: boolean, strictChange: boolean }
