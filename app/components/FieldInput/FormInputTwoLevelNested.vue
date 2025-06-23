<script setup lang="ts">
import type { NestedEditValue, NestedItemValue } from "./type"
import { type FieldConfigNested, FieldType } from "~/composables/project/model/project"

// import { zodResolver } from "@primevue/forms/resolvers/zod"
// import { createZodSchema } from "~/components/FieldInput/form-validation"
// import FormInputSingular from "./FormInputSingular.vue"

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
  isMultiNested: false,
})

function addNewItem(field: FieldConfigNested, isMultiNested: boolean) {
  nestedEditValue.config = field
  nestedEditValue.visible = true
  nestedEditValue.isMultiNested = isMultiNested
}

// eslint-disable-next-line unused-imports/no-unused-vars
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

onMounted(() => {
  for (const field of props.itemValue.config.fields) {
    if (field.type === FieldType.NESTED) {
      nestedFieldsData.value[field.key] = []
    }
  }
})
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-200 p-4 dark:bg-surface-900">
    <div class="mb-5 font-bold" :class="[props.itemValue?.config.required ? 'required' : '']">
      Add item of {{ props.itemValue?.config.name }}
    </div>
    <template v-for="(field) in props.itemValue.config.fields" :key="field.key">
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
                <template v-if="field.type === FieldType.NESTED">
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
                </template>
              </IftaLabel>
            </div>
            <div class="flex grow-0 justify-around space-x-1 ">
              <Button
                v-if="field.type === FieldType.NESTED" severity="secondary" variant="text"
                size="small"
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
        <Button
          v-if="field.type === FieldType.NESTED"
          fluid rounded severity="secondary"
          class="text-sm"
          @click="addNewItem(field, false)"
        >
          Add new item
        </Button>
      </div>
    </template>
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
