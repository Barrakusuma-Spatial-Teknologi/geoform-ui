<script setup lang="ts">
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import { get } from "es-toolkit/compat"
import { match, P } from "ts-pattern"
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
})[]>([])

let projectData!: ReturnType<typeof useProjectData>

async function resetFields() {
  const data = props.projectDataId != null ? await projectData.getById(props.projectDataId) : {}

  fieldValues.value = await Promise.all(
    props.fields.map(async (field) => {
      let value = get<Record<string, undefined | string | boolean | number | Date>>(data ?? {}, `data.data.${field.key}`)
      if (field.type === FieldType.IMAGE && value != null) {
        const imageKey = value
        value = await projectData.getImage(value as string)

        return {
          ...field,
          value,
          meta: {
            key: imageKey,
          },
        }
      }

      if (field.type === FieldType.DATE && value != null) {
        value = new Date(value as string)
      }

      return {
        ...field,
        value,
      }
    }),
  )
}

watch(props.fields, () => {
  resetFields()
})

const toast = useToast()

function isUuid(input: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidRegex.test(input)
}
async function save() {
  const feature: ProjectDataFeature = {
    geom: {
      type: "Point",
      coordinates: [props.coordinate.lng, props.coordinate.lat],
    },
    data: {},
  }

  const errors: { name: string, error: string[] }[] = []
  const projectDataId = generateId()
  for (const row of fieldValues.value) {
    const error: string[] = []
    // const featureData = get(feature.data, row.key)
    // if(fea)

    const rowValue = feature.data[row.key] = match(row.value)
      .returnType<undefined | string | number | boolean | Date | string[]>()
      .with(P.array(), (values) => values as string[])
      .with(P.string, (v) => v)
      .with(P.number, (v) => v)
      .otherwise((obj) => get(obj, "key") ?? get(obj, "value"))

    if (rowValue == null && row.required) {
      error.push("required, can not be empty")
      if (row.type === FieldType.IMAGE) {
        toast.add({
          life: 5000,
          closable: true,
          severity: "error",
          summary: `${row.name} is required, can not be empty`,
        })
        throw new Error("image cannot be empty")
      }
    }

    if (row.type === FieldType.IMAGE && rowValue != null) {
      feature.data[row.key] = await projectData.upsertImage(row.value as string, projectDataId, get(row, "meta.key"))
      continue
    }

    feature.data[row.key] = rowValue

    if (error.length > 0) {
      errors.push({
        name: row.name,
        error,
      })
    }
  }

  if (errors.length > 0) {
    toast.add({
      life: 5000,
      closable: true,
      severity: "error",
      summary: `Field: ${errors.map((e) => e.name).join(", ")} is required, can not be empty`,
    })

    return
  }

  if (props.projectDataId == null) {
    await projectData.add(feature)
  }
  else {
    await projectData.update(props.projectDataId, feature)
  }

  emits("save", feature)
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

onActivated(() => {
  projectData = useProjectData(props.projectId)
  resetFields()
})
onMounted(() => {
  projectData = useProjectData(props.projectId)
  resetFields()
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

    <div class="w-full grow basis-0 overflow-y-auto">
      <ul class="flex w-full flex-col space-y-4">
        <li>
          <div class="text-sm text-surface-400">
            Location at
          </div>

          <div>
            {{ convertDDToDMS(props.coordinate.lng) }} ; {{ convertDDToDMS(props.coordinate.lat) }}
          </div>
        </li>

        <li v-for="field in fieldValues" :key="field.key" class="w-full" :class="[field.required ? 'required' : '']">
          <template v-if="field.type === FieldType.TEXT">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <InputText :id="field.key" v-model.lazy="field.value as string" fluid />
            </div>
          </template>
          <template v-else-if="field.type === FieldType.NUMBER">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
                <template v-if="field.required">*</template>
              </label>
              <InputNumber :id="field.key" v-model.lazy="field.value as number" fluid />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.DATE">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <DatePicker :id="field.key" v-model="field.value as Date" fluid />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.IMAGE">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <FieldInputImage v-model:image="field.value as string" />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.CHECKBOX">
            <div class="space-y-1">
              <label class="text-sm" :for="field.key">
                {{ field.name }}
              </label>
              <Listbox
                v-if="(field.fieldConfig?.options ?? []).length <= 4"
                v-model="field.value"
                :multiple="field.fieldConfig?.multiple ?? true"
                :options="field.fieldConfig?.options ?? []" option-label="value" option-value="key" class="w-full"
                fluid
              />
              <MultiSelect
                v-else-if="field.fieldConfig?.multiple ?? true"
                v-model="field.value"
                filter
                :options="field.fieldConfig?.options ?? []"
                option-label="value"
                option-value="key"
                class="w-full"
                fluid
              />
              <Select
                v-else
                v-model="field.value"
                filter
                :options="field.fieldConfig?.options ?? []"
                option-label="value"
                option-value="key"
                class="w-full"
                fluid
              />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.BOOLEAN">
            <div class="flex items-center gap-2">
              <Checkbox :id="field.key" v-model="field.value" binary />
              <label :for="field.key"> {{ field.name }} </label>
            </div>
          </template>
        </li>
      </ul>
    </div>

    <div class="flex w-full justify-between gap-4">
      <Button
        class="grow-0" variant="text" severity="secondary" @click="() => {
          emits('close')
        }"
      >
        Cancel
      </Button>
      <Button class="grow font-bold" @click="save">
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped>
li.required label:after {
  @apply text-red-400;
  content: " *";
}
</style>
