export interface Project {
  id: string
  name: string
  createdAt: number
  fields: FieldConfig[]
  createdBy: string
  syncAt?: number
  updatedAt?: number
  versionId?: string
  isCollaboration?: boolean
  participantQuota?: number
  participantNum?: number
  maxDistance?: number
}

export enum FieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  CHECKBOX = "CHECKBOX",
  IMAGE = "IMAGE",
  BOOLEAN = "BOOLEAN",
  NESTED = "NESTED",
}

export const fieldOptions: FieldType[] = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.DATE,
  FieldType.CHECKBOX,
  FieldType.IMAGE,
  FieldType.BOOLEAN,
  FieldType.NESTED,
]

export const fieldOptionsWithoutNestedType: Exclude<FieldType, FieldType.NESTED>[] = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.DATE,
  FieldType.CHECKBOX,
  FieldType.IMAGE,
  FieldType.BOOLEAN,
]

export const FieldOptionSearchable: FieldType[] = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.DATE,
  FieldType.CHECKBOX,
  FieldType.BOOLEAN,
]

interface FC<FT extends FieldType> {
  key: string
  name: string
  required: boolean
  type: FT
}

export interface FieldConfigCheckbox extends FC<FieldType.CHECKBOX> {
  fieldConfig: {
    options: {
      key: string
      value: string
    }[]
    multiple: boolean
  }
}

export interface FieldConfigText extends FC<FieldType.TEXT> {
  fieldConfig?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
}

export interface FieldConfigNumber extends FC<FieldType.NUMBER> {
  fieldConfig?: {
    min?: number
    max?: number
    step?: number
    isFloat?: boolean
  }
}

export interface FieldConfigDate extends FC<FieldType.DATE> {
  fieldConfig?: {
    minDate?: string
    maxDate?: string
  }
}

export interface FieldConfigImage extends FC<FieldType.IMAGE> {
  fieldConfig?: {
    acceptedFormats?: string[]
    maxSize?: number // in bytes
  }
}

interface FieldConfigBoolean extends FC<FieldType.BOOLEAN> {
  fieldConfig?: Record<string, unknown>
}

export interface FieldConfigNested extends FC<FieldType.NESTED> {
  fields: FieldConfigSingular[]
  fieldConfig?: {
    minItem?: number
  }
}

export type FieldConfigSingular =
  | FieldConfigText
  | FieldConfigNumber
  | FieldConfigDate
  | FieldConfigCheckbox
  | FieldConfigImage
  | FieldConfigBoolean

// kuk

export type FieldConfig =
  | FieldConfigText
  | FieldConfigNumber
  | FieldConfigDate
  | FieldConfigCheckbox
  | FieldConfigImage
  | FieldConfigBoolean
  | FieldConfigNested
