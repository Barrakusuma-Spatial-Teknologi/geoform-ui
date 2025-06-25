<script setup lang="ts">
import type { NestedEditValue, NestedItemValue } from "./type"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import { type FieldConfigNested, FieldType } from "~/composables/project/model/project"

const props = defineProps<{
  itemValue: NestedEditValue
}>()

const emits = defineEmits<{
  addItemData: [nestedFieldData: NestedItemValue, nestedItemKey: string, index?: number]
  close: []
}>()

const nestedFieldsData = ref<Record<string, NestedItemValue[]>>({})
const nestedEditValue = reactive<NestedEditValue>({
  item: undefined,
  config: {} as FieldConfigNested,
  visible: false,
  index: undefined,
})
const toast = useToast()
const formRef = ref<InstanceType<typeof PvForm>>()
const validationSchema = ref(zodResolver(createZodSchema(props.itemValue.config.fields)))

function addNewItem(field: FieldConfigNested, isMultiNested: boolean) {
  nestedEditValue.config = field
  nestedEditValue.visible = true
  nestedEditValue.isMultiNested = isMultiNested
}

function addNestedFieldItemData(
  nestedItemData: NestedItemValue,
  nestedItemKey: string,
  nestedItemIndex?: number,
) {
  if (!nestedFieldsData.value[nestedItemKey]) {
    return
  }

  if (nestedItemIndex == null) {
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
  isMultiNested: boolean,
) {
  nestedEditValue.config = fieldConfig
  nestedEditValue.item = value
  nestedEditValue.index = itemIndex
  nestedEditValue.visible = true
  nestedEditValue.isMultiNested = isMultiNested
}

function closeNestedForm() {
  nestedEditValue.visible = false
  nestedEditValue.item = {}
  nestedEditValue.index = undefined
}

const initialValues = computed(() => {
  return props.itemValue.index !== undefined ? props.itemValue.item : {}
})

function validateNestedInput(e: FormSubmitEvent) {
  const finalData: NestedItemValue = {}

  for (const row of props.itemValue.config.fields) {
    if (row.type === FieldType.NESTED) {
      const minimalItem = row.fieldConfig?.minItem
      const itemLength = (nestedFieldsData.value[row.key] ?? []).length

      if (minimalItem && itemLength < minimalItem) {
        e.valid = false
        toast.add({
          severity: "error",
          summary: `Minimal Item for ${row.name} is ${minimalItem}`,
        })
        return
      }

      const nestedData = nestedFieldsData.value[row.key]

      if (nestedData == null) {
        return
      }

      finalData[row.key] = nestedData
      continue
    }

    finalData[row.key] = e.values[row.key]
  }

  return finalData
}

function save(e: FormSubmitEvent) {
  const finalData = validateNestedInput(e)

  if (!e.valid || finalData == null) {
    toast.add({
      severity: "error",
      summary: "Invalid data",
    })
    return
  }

  if (props.itemValue.index == null) {
    emits("addItemData", finalData, props.itemValue.config.key, props.itemValue.index)
    return
  }

  emits("addItemData", finalData, props.itemValue.config.key)
}

onMounted(() => {
  for (const field of props.itemValue.config.fields) {
    if (field.type === FieldType.NESTED) {
      const initialValue = initialValues.value?.[field.key]
      nestedFieldsData.value[field.key] = Array.isArray(initialValue) ? initialValue : []
    }
  }
})
</script>

<template>
  <div class="relative size-full">
    <TransitionSlide :offset="[0, '100%']">
      <template v-if="nestedEditValue.visible">
        <div class="absolute inset-0 z-[9999]">
          <FieldInputFormInputNested
            v-if="!nestedEditValue.isMultiNested"
            :item-value="nestedEditValue"
            @add-item-data="addNestedFieldItemData"
            @close="closeNestedForm"
          />
          <FieldInputFormInputTwoLevelNested
            v-else
            :item-value="nestedEditValue"
            @add-item-data="addNestedFieldItemData"
            @close="closeNestedForm"
          />
        </div>
      </template>
    </TransitionSlide>
    <div class="box-border flex size-full flex-col rounded-lg bg-surface-200 p-4 dark:bg-surface-900">
      <PvForm
        v-if="initialValues != null" v-slot="$form" ref="formRef" class="flex w-full grow flex-col"
        :initial-values="initialValues"
        :resolver="validationSchema"
        @submit="save"
      >
        <ul class="box-border flex w-full grow basis-0 flex-col space-y-4 overflow-y-auto pb-8 pt-2">
          <li
            v-for="(field) in props.itemValue.config.fields" :key="field.key" class="w-full space-y-2"
            :class="[field.required ? 'required' : '']"
          >
            <template v-if="field.type !== FieldType.NESTED">
              <FieldInputFormInputSingular :field="field" :form="$form" />
            </template>
            <template v-else-if="field.type === FieldType.NESTED && isMultiLevelNested(field)">
              <FieldInputNestedItemDisplay
                :field="field"
                :nested-fields-data="nestedFieldsData"
                :is-multi-level="true"
                @edit="(value, index, isMultiLevel) => editItem(field, value, index, isMultiLevel)"
                @delete="(index) => deleteItem(field.key, index)"
                @add="addNewItem"
              />
            </template>
            <template v-else>
              <FieldInputNestedItemDisplay
                :field="field"
                :nested-fields-data="nestedFieldsData"
                :is-multi-level="false"
                @edit="(value, index, isMultiLevel) => editItem(field, value, index, isMultiLevel)"
                @delete="(index) => deleteItem(field.key, index)"
                @add="addNewItem"
              />
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
label.required:after {
  @apply text-red-400;
  content: " *";
}

li.required label:after {
  @apply text-red-400;
  content: " *";
}
</style>
