<script setup lang="ts">
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { get } from "es-toolkit/compat"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import { type FieldConfig, FieldType } from "~/composables/project/model/project"
import { useProjectData } from "~/composables/project/project-data"

const props = defineProps<{
  projectId: string
  projectDataId?: string
  fields: FieldConfig[]
  coordinate: {
    lng: number
    lat: number
  }
}>()

const emits = defineEmits<{
  close: []
  save: [feature: Record<string, any>]
}>()

const fieldValues = ref<(FieldConfig & {
  value: unknown
  meta?: {
    key: string
  }
  valid?: boolean
})[]>([])

const validationSchema = ref(zodResolver(createZodSchema(props.fields)))
const initialValues = ref<Record<string, any>>()

const fieldDirty = ref(false)
const watchField = watchPausable(fieldValues, () => {
  fieldDirty.value = true
  watchField.pause()
})

let projectData!: ReturnType<typeof useProjectData>

let imageOriginalKey: Record<string, string> = {}

async function resetFields() {
  const data = props.projectDataId != null ? await projectData.getById(props.projectDataId) : {}
  const init: Record<string, any> = {}

  imageOriginalKey = {}
  fieldValues.value = await Promise.all(
    props.fields.map(async (field) => {
      let value = get<Record<string, undefined | string | boolean | number | Date>>(data ?? {}, `data.data.${field.key}`)
      if (field.type === FieldType.IMAGE && value != null) {
        const imageKey = String(value)
        value = await projectData.getImage(value as string)

        init[field.key] = value
        imageOriginalKey[field.key] = imageKey

        return {
          ...field,
          value,
          meta: {
            key: imageKey,
          },
          valid: undefined,
        }
      }

      if (field.type === FieldType.DATE && value != null) {
        value = new Date(value as string)
      }

      init[field.key] = value

      return {
        ...field,
        value,
        valid: undefined,
      }
    }),
  )

  initialValues.value = init
  watchField.resume()
}

watch(props.fields, () => {
  resetFields()
})

const toast = useToast()

function _isUuid(input: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidRegex.test(input)
}

const formRef = ref<InstanceType<typeof PvForm>>()

async function save(e: FormSubmitEvent) {
  if (!e.valid) {
    toast.add({
      severity: "error",
      summary: "Invalid data",
    })
    return
  }

  const feature: ProjectDataFeature = {
    geom: {
      type: "Point",
      coordinates: [props.coordinate.lng, props.coordinate.lat],
    },
    data: {},
  }

  try {
    const projectDataId = props.projectDataId ?? generateId()
    for (const row of props.fields) {
      const rowValue = e.values[row.key] as undefined | string | number | boolean | Date | string[]

      if (row.type === FieldType.IMAGE && rowValue != null) {
        feature.data[row.key] = await projectData.upsertImage(e.values[row.key]!, projectDataId, get(imageOriginalKey, row.key))
        continue
      }

      feature.data[row.key] = rowValue
    }

    if (props.projectDataId == null) {
      await projectData.add(feature, projectDataId)
    }
    else {
      await projectData.update(props.projectDataId, feature)
    }

    emits("save", feature)
  }
  catch (e) {
    if (e?.message === "QuotaExceededError ") {
      toast.add({
        severity: "error",
        summary: "Storage full",
        detail: "Please delete some data",
        group: "bc",
      })
      return
    }
    console.error(e)
  }
}

function convertDDToDMS(decimalDegrees: number): string {
  const isNegative = decimalDegrees < 0
  const absoluteDegrees = Math.abs(decimalDegrees)

  const degrees = Math.floor(absoluteDegrees)
  const minutesFull = (absoluteDegrees - degrees) * 60
  const minutes = Math.floor(minutesFull)
  const seconds = Math.round((minutesFull - minutes) * 60)

  const sign = isNegative ? "-" : ""
  return `${sign}${degrees}° ${minutes}' ${seconds}"`
}

onActivated(async () => {
  projectData = useProjectData(props.projectId)
  await resetFields()
})
onMounted(async () => {
  projectData = useProjectData(props.projectId)
  await resetFields()
})

onBeforeUnmount(() => {
  resetFields()
})
onDeactivated(() => {
  resetFields()
})
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
    <div class="mb-5 grow-0 font-bold">
      Fill form
    </div>

    <PvForm
      v-if="initialValues != null" v-slot="$form" ref="formRef" class="flex w-full grow flex-col"
      :initial-values="initialValues"
      :resolver="validationSchema"
      @submit="save"
    >
      <ul class="box-border flex w-full grow basis-0 flex-col space-y-4 overflow-y-auto pb-8 pt-2">
        <li>
          <div class="text-sm text-surface-400">
            Location at
          </div>

          <div>
            {{ convertDDToDMS(props.coordinate.lng) }} ; {{ convertDDToDMS(props.coordinate.lat) }}
          </div>
        </li>

        <li
          v-for="field in props.fields" :key="field.key" class="w-full space-y-2"
          :class="[field.required ? 'required' : '']"
        >
          <template v-if="field.type === FieldType.TEXT">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <InputText :id="field.key" :name="field.key" fluid />
              <Message v-if="$form[field.key]?.invalid" class="h-5" severity="error" size="small" variant="simple">
                {{ $form[field.key]?.error?.message }}
              </Message>
            </div>
          </template>
          <template v-else-if="field.type === FieldType.NUMBER">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <InputNumber
                :id="field.key" :name="field.key" locale="id-ID"
                :min-fraction-digits="(field?.fieldConfig?.isFloat ?? false) ? 1 : 0"
                :max-fraction-digits="(field?.fieldConfig?.isFloat ?? false) ? 10 : 1"
                fluid
              />
              <Message v-if="$form[field.key]?.invalid" severity="error" size="small" variant="simple">
                {{ $form[field.key]?.error?.message }}
              </Message>
            </div>
          </template>

          <template v-else-if="field.type === FieldType.DATE">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <DatePicker :id="field.key" :name="field.key" fluid date-format="dd/mm/yy" />

              <Message v-if="$form[field.key]?.invalid" severity="error" size="small" variant="simple">
                {{ $form[field.key]?.error?.message }}
              </Message>
            </div>
          </template>

          <template v-else-if="field.type === FieldType.IMAGE">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <FormField v-slot="$field" :name="field.key" :initial-value="$form[field.key]?.value">
                <FieldInputImage
                  :id="field.key"
                  :default-value="$form[field.key]?.value"
                  :config="field.fieldConfig"
                  :prime-field="$field"
                  @update:image="(value) => {
                    // @ts-expect-error fast bypass
                    $field.onInput({ data: value, value } as InputEvent)
                  }"
                />

                <Message v-if="$form[field.key]?.invalid" severity="error" size="small" variant="simple">
                  {{ $form[field.key]?.error?.message }}
                </Message>
              </FormField>
            </div>
          </template>

          <template v-else-if="field.type === FieldType.CHECKBOX">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <Listbox
                v-if="(field.fieldConfig?.options ?? []).length <= 4"
                :id="field.key" :name="field.key"
                :multiple="field.fieldConfig?.multiple ?? true"
                :options="field.fieldConfig?.options ?? []" option-label="value" option-value="key" class="w-full"
                fluid
              />
              <MultiSelect
                v-else-if="field.fieldConfig?.multiple ?? true"
                :id="field.key" :name="field.key"
                filter
                :options="field.fieldConfig?.options ?? []"
                option-label="value"
                option-value="key"
                class="w-full"
                fluid
              />
              <Select
                v-else
                :id="field.key" :name="field.key"
                filter
                :options="field.fieldConfig?.options ?? []"
                option-label="value"
                option-value="key"
                class="w-full"
                fluid
              />

              <Message v-if="$form[field.key]?.invalid" severity="error" size="small" variant="simple">
                {{ $form[field.key]?.error?.message }}
              </Message>
            </div>
          </template>

          <template v-else-if="field.type === FieldType.BOOLEAN">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <Checkbox :id="field.key" :name="field.key" binary />
                <label :for="field.key"> {{ field.name }} </label>
              </div>
              <Message v-if="$form[field.key]?.invalid" severity="error" size="small" variant="simple">
                {{ $form[field.key]?.error?.message }}
              </Message>
            </div>
          </template>
        </li>
      </ul>

      <div class="flex w-full justify-between gap-4">
        <Button
          class="grow-0" variant="text" severity="secondary" @click="() => {
            emits('close')
          }"
        >
          Cancel
        </Button>
        <Button class="grow font-bold" type="submit">
          Save
        </Button>
      </div>
    </PvForm>
  </div>
</template>

<style scoped>
li.required label:after {
  @apply text-red-400;
  content: " *";
}
</style>
