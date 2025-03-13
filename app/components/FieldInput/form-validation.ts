import { match } from "ts-pattern"
import { z } from "zod"
import { type FieldConfig, FieldType } from "~/composables/project/model/project"

export function createZodSchema(fields: FieldConfig[]) {
  const schema: Record<string, z.ZodTypeAny> = {}

  fields.forEach((field) => {
    const fieldSchema = match(field)
      .returnType<z.ZodTypeAny>()
      .with({ type: FieldType.TEXT }, ({ fieldConfig }) => {
        let fieldSchema = z.string()

        if (fieldConfig?.minLength) {
          fieldSchema = fieldSchema.min(fieldConfig.minLength, {
            message: `Minimum ${fieldConfig.minLength} characters required`,
          })
        }

        if (fieldConfig?.maxLength) {
          fieldSchema = fieldSchema.max(fieldConfig.maxLength, {
            message: `Maximum ${fieldConfig.maxLength} characters allowed`,
          })
        }

        if (fieldConfig?.pattern) {
          fieldSchema = fieldSchema.regex(new RegExp(fieldConfig.pattern), {
            message: "Invalid pattern",
          })
        }

        return fieldSchema
      })
      .with({ type: FieldType.NUMBER }, ({ fieldConfig }) => {
        let fieldSchema = z.number()

        if (fieldConfig?.min) {
          fieldSchema = fieldSchema.gte(fieldConfig.min, {
            message: `Minimum value is ${fieldConfig.min}`,
          })
        }

        if (fieldConfig?.max) {
          fieldSchema = fieldSchema.lte(fieldConfig.max, {
            message: `Maximum value is ${fieldConfig.max}`,
          })
        }

        return fieldSchema
      })
      .with({ type: FieldType.DATE }, ({ fieldConfig }) => {
        let fieldSchema = z.date()

        if (fieldConfig?.minDate) {
          fieldSchema = fieldSchema.min(
            new Date(fieldConfig.minDate),
            {
              message: `Date must be after ${fieldConfig.minDate}`,
            },
          )
        }

        if (fieldConfig?.maxDate) {
          fieldSchema = fieldSchema.max(
            new Date(fieldConfig.maxDate),
            {
              message: `Date must be before ${fieldConfig.maxDate}`,
            },
          )
        }

        return fieldSchema
      })
      .with({ type: FieldType.CHECKBOX }, () => {
        return z.union([z.array(z.string()), z.string()])
      })
      .with({ type: FieldType.IMAGE }, () => {
        return z.string()
      })
      .with({ type: FieldType.BOOLEAN }, () => {
        return z.boolean()
      })
      .otherwise((_o) => {
        return z.any()
      })

    schema[field.key] = field.required && field.type !== FieldType.NESTED
      ? fieldSchema
      : z.optional(fieldSchema)
  })

  return z.object(schema)
}
