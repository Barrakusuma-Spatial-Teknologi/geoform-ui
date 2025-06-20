<script setup lang="ts">
import type { NestedEditValue, NestedItemValue } from "./type"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { get } from "es-toolkit/compat"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import { type FieldConfig, type FieldConfigNested, FieldType } from "~/composables/project/model/project"
import { useProjectData } from "~/composables/project/project-data"
import { useProjectTags } from "~/composables/project/project-tags"
import { useUiBlocker } from "~/composables/ui/blocker"
import FormInputNested from "./FormInputNested.vue"
import FormInputSingular from "./FormInputSingular.vue"

const props = defineProps<{
  projectId: string
  projectDataId?: string
  fields: FieldConfig[]
  coordinate: {
    lng: number
    lat: number
  }
  participantLocation:
    [longitude: number, latitude: number] | undefined
  tags?: string[]
}>()

const emits = defineEmits<{
  close: []
  save: [feature: Record<string, any>, tags?: string[]]
  editCoordinate: []
}>()

const fieldValues = ref<(FieldConfig & {
  value: unknown
  meta?: {
    key: string
  }
  valid?: boolean
})[]>([])

const blocker = useUiBlocker()

const validationSchema = ref(zodResolver(createZodSchema(props.fields)))
const initialValues = ref<Record<string, any>>()

const fieldDirty = ref(false)
const watchField = watchPausable(fieldValues, () => {
  fieldDirty.value = true
  watchField.pause()
})

let projectData!: ReturnType<typeof useProjectData>

let imageOriginalKey: Record<string, string> = {}

const nestedFieldsData = ref<Record<string, NestedItemValue[]>>({})
const projectDataTags = ref<string[]>([])
async function setDataTags() {
  const data = props.projectDataId != null ? await projectData.getById(props.projectDataId) : {}

  const existingTags = get(data, "tags") as string[] | undefined
  if (existingTags != null && (props.tags == null || props.tags.length === 0)) {
    projectDataTags.value = existingTags
  }
  else {
    projectDataTags.value = props.tags ?? []
  }
}

watch(() => props.tags, async () => {
  await setDataTags()
})

async function resetFields() {
  const data = props.projectDataId != null ? await projectData.getById(props.projectDataId) : {}
  const init: Record<string, any> = {}

  await setDataTags()

  imageOriginalKey = {}
  fieldValues.value = await Promise.all(
    props.fields.map(async (field) => {
      let value = get<Record<string, undefined | string | boolean | number | Date | NestedItemValue[]>>(data ?? {}, `data.data.${field.key}`)
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

      if (field.type === FieldType.NESTED && value != null) {
        for (const valueItem of (value as NestedItemValue[])) {
          nestedFieldsData.value[field.key]?.push(valueItem)
        }
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

const nestedEditValue = reactive<NestedEditValue>({
  item: undefined,
  config: {} as FieldConfigNested,
  visible: false,
  index: undefined,
})

function addNewItem(field: FieldConfigNested) {
  nestedEditValue.config = field
  nestedEditValue.visible = true
}

function addNestedFieldItemData(
  nestedItemData: NestedItemValue,
  nestedItemKey: string,
  nestedItemIndex?: number,
) {
  if (!nestedFieldsData.value[nestedItemKey]) {
    return
  }

  if (nestedItemIndex === undefined) {
    nestedFieldsData.value[nestedItemKey].push(nestedItemData)
    closeNestedForm()
    return
  }

  nestedFieldsData.value[nestedItemKey][nestedItemIndex] = nestedItemData
  closeNestedForm()
}

function deleteItem(fieldKey: string, index: number) {
  nestedFieldsData.value[fieldKey]!.splice(index, 1)
}

function editItem(
  fieldConfig: FieldConfigNested,
  value: NestedItemValue,
  itemIndex: number,
) {
  nestedEditValue.config = fieldConfig
  nestedEditValue.item = value
  nestedEditValue.index = itemIndex
  nestedEditValue.visible = true
}

function closeNestedForm() {
  nestedEditValue.visible = false
  nestedEditValue.item = {}
  nestedEditValue.index = undefined
}

function formatItemValue(
  itemValue: NestedItemValue,
  checkboxOption?: Record<string, string>[],
) {
  const firstKey = Object.keys(itemValue)[0]

  if (!firstKey) {
    return
  }

  const value = itemValue[firstKey]

  if (!checkboxOption) {
    return value
  }

  let valueText = ""

  if (Array.isArray(value)) {
    valueText = value
      .map((v) => checkboxOption.find((o) => o.key === v)?.value || "")
      .join(", ")

    return valueText
  }

  valueText = checkboxOption.find((o) => o.key === value)?.value || ""
  return valueText
}

/**
 * Handles the save operation for the form submission event. Validates the form data, processes the required
 * feature, interacts with project data for adding or updating information, and emits the save event
 * with the saved feature and associated tags.
 */
async function save(e: FormSubmitEvent): Promise<void> {
  if (!e.valid) {
    toast.add({
      severity: "error",
      summary: "Invalid data",
    })
    return
  }

  try {
    blocker.show("Saving survey data...")
    const featureRes = await buildFeature(e)
    if (featureRes == null) {
      return
    }
    const [feature, projectDataId] = featureRes

    if (props.projectDataId == null) {
      await projectData.add(feature, props.participantLocation, projectDataId)
    }
    else {
      await projectData.update(props.projectDataId, feature)
    }

    emits("save", feature, projectDataTags.value)
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
  finally {
    blocker.hide()
  }
}

async function buildFeature(e: FormSubmitEvent): Promise<[ProjectDataFeature, string] | undefined> {
  const feature: ProjectDataFeature = {
    geom: {
      type: "Point",
      coordinates: [props.coordinate.lng, props.coordinate.lat],
    },
    data: {},
    tags: toRaw(projectDataTags.value),
  }

  const projectDataId = props.projectDataId ?? generateId()
  for (const row of props.fields) {
    const rowValue = e.values[row.key] as undefined | string | number | boolean | Date | string[]

    if (row.type === FieldType.NESTED) {
      const minimalItem = row.fieldConfig?.minItem

      for (const [key, value] of Object.entries(nestedFieldsData.value)) {
        if (minimalItem && value.length < minimalItem) {
          e.valid = false
          toast.add({
            severity: "error",
            summary: `Minimal Item for ${row.name} is ${minimalItem}`,
          })
          return
        }
        feature.data[key] = value
      }
      continue
    }

    if (row.type === FieldType.IMAGE && rowValue != null) {
      feature.data[row.key] = await projectData.upsertImage(e.values[row.key]!, projectDataId, get(imageOriginalKey, row.key))
      continue
    }

    feature.data[row.key] = rowValue
  }

  return [feature, projectDataId]
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

const projectTags = ref<Record<string, string>>()

async function getProjectTags() {
  projectTags.value = await useProjectTags(props.projectId).get()
}

onActivated(async () => {
  projectData = useProjectData(props.projectId)
  await getProjectTags()
  await resetFields()
})
onMounted(async () => {
  for (const field of props.fields) {
    if (field.type === FieldType.NESTED) {
      nestedFieldsData.value[field.key] = []
    }
  }

  projectData = useProjectData(props.projectId)
  await getProjectTags()
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
  <div class="relative size-full">
    <TransitionSlide :offset="[0, '100%']">
      <template v-if="nestedEditValue.visible">
        <div class="absolute inset-0 z-[9999]">
          <FormInputNested
            :item-value="nestedEditValue"
            @add-item-data="addNestedFieldItemData"
            @close="closeNestedForm"
          />
        </div>
      </template>
    </TransitionSlide>
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

            <div class="flex items-center justify-between">
              <div>
                {{ convertDDToDMS(props.coordinate.lng) }} ; {{ convertDDToDMS(props.coordinate.lat) }}
              </div>

              <Button severity="secondary" variant="text" size="small" @click="emits('editCoordinate')">
                <i class="i-[solar--pen-linear] text-lg" />
              </Button>
            </div>
          </li>

          <li v-if="projectDataTags.length > 0">
            <div class="mb-1 text-sm text-surface-400">
              Tags
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-for="tag in projectDataTags ?? []" :key="tag">
                <Tag :value="get(projectTags, tag, tag)" rounded />
              </template>
            </div>
          </li>

          <li
            v-for="(field) in props.fields" :key="field.key" class="w-full space-y-2"
            :class="[field.required ? 'required' : '']"
          >
            <template v-if="field.type !== FieldType.NESTED">
              <FormInputSingular :field="field" :form="$form" />
            </template>
            <template v-else>
              <label :for="field.key" class="text-sm">
                {{ field.name }}
              </label>
              <template v-if="nestedFieldsData[field.key] != null">
                <ul
                  :class="nestedFieldsData[field.key]?.length !== 0
                    ? 'dark:bg-surface-700 p-3 rounded bg-surface-200'
                    : ''"
                >
                  <li
                    v-for="(value, nestedItemIndex) in nestedFieldsData[field.key]"
                    :key="nestedItemIndex"
                    class="remove-required flex w-full space-x-2 "
                  >
                    <div class="grow rounded">
                      <IftaLabel>
                        <label :for="field.fields[0]?.key">{{ field.fields[0]?.name }}</label>
                        <template v-if="field.fields[0]?.type === FieldType.CHECKBOX">
                          <InputText
                            fluid readonly :value="formatItemValue(value, field.fields[0].fieldConfig.options)"
                          />
                        </template>
                        <template v-else-if="field.fields[0]?.type === FieldType.IMAGE">
                          <Image :src="formatItemValue(value) as string" />
                        </template>
                        <template v-else>
                          <InputText fluid readonly :value="formatItemValue(value)" />
                        </template>
                      </IftaLabel>
                    </div>
                    <div class="flex grow-0 justify-around space-x-1 ">
                      <Button
                        severity="secondary" variant="text" size="small"
                        @click="editItem(field, value, Number(nestedItemIndex))"
                      >
                        <i class="i-[solar--pen-linear] text-lg" />
                      </Button>
                      <Button
                        severity="secondary" variant="text" size="small"
                        @click="deleteItem(field.key, Number(nestedItemIndex))"
                      >
                        <i class="i-[solar--trash-bin-2-linear] text-lg" />
                      </Button>
                    </div>
                  </li>
                </ul>
              </template>

              <div
                class="mt-2 box-border flex justify-center rounded px-2 py-1"
                :class="nestedFieldsData[field.key]?.length === 0
                  ? 'border-dashed border-2' : ''"
              >
                <Button fluid rounded severity="secondary" class="text-sm" @click="addNewItem(field)">
                  Add new item
                </Button>
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
  </div>
</template>

<style scoped>
li.required label:after {
  @apply text-red-400;
  content: " *";
}

.remove-required::after {
  content: none !important;
}

li.remove-required label:after {
  content: none;
}
</style>
