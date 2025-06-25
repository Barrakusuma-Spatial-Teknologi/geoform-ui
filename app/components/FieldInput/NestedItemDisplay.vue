<script setup lang="ts">
import type { NestedItemValue } from "~/components/FieldInput/type"
import { type FieldConfigNested, FieldType } from "~/composables/project/model/project"

const props = defineProps<{
  field: FieldConfigNested
  nestedFieldsData: Record<string, NestedItemValue[]>
  isMultiLevel: boolean
}>()

const emits = defineEmits<{
  edit: [value: NestedItemValue, index: number, isMultiLevel: boolean]
  delete: [index: number]
  add: [field: FieldConfigNested, isMultiLevel: boolean]
}>()

function isNestedItemValue(val: string | number | boolean | Date | NestedItemValue[] | NestedItemValue): val is NestedItemValue {
  return (
    typeof val === "object"
    && val !== null
    && !Array.isArray(val)
  )
}

function getFirstNestedItem(value: NestedItemValue, key: string): NestedItemValue | undefined {
  if (Array.isArray(value) && value.length > 0 && isNestedItemValue(value[0])) {
    return getFirstNestedItem(value[0], key)
  }

  const nested = value[key]

  if (nested == null) {
    return undefined
  }

  if (isNestedItemValue(nested)) {
    return drillDown(nested as NestedItemValue)
  }

  if (Array.isArray(nested) && nested.length > 0 && isNestedItemValue(nested[0] as NestedItemValue)) {
    return drillDown(nested[0] as NestedItemValue)
  }

  return undefined
}

function drillDown(value: NestedItemValue): NestedItemValue | undefined {
  const keys = Object.keys(value)

  if (keys.length === 0) {
    return undefined
  }

  const firstKey = keys[0] as string
  const nextValue = value[firstKey]

  if (nextValue == null) {
    return undefined
  }

  if (isNestedItemValue(nextValue)) {
    return drillDown(nextValue as NestedItemValue)
  }

  if (Array.isArray(nextValue) && nextValue.length > 0 && isNestedItemValue(nextValue[0] as NestedItemValue)) {
    return drillDown(nextValue[0] as NestedItemValue)
  }

  return value
}

function formatItemValue(
  itemValue?: NestedItemValue,
  checkboxOption?: Record<string, string>[],
) {
  if (!itemValue) {
    return
  }

  const firstKey = Object.keys(itemValue)[0]

  if (!firstKey) {
    return
  }

  const value = itemValue[firstKey]

  if (!checkboxOption) {
    return value
  }

  let valueText = ""

  if (Array.isArray(value) && typeof value[0] !== "object") {
    valueText = value
      .map((v) => checkboxOption.find((o) => o.key === String(v))?.value || "")
      .join(", ")

    return valueText
  }

  valueText = checkboxOption.find((o) => o.key === value)?.value || ""
  return valueText
}
</script>

<template>
  <label :for="props.field.key" class="text-sm">{{ props.field.name }}</label>

  <template v-if="props.nestedFieldsData[field.key] != null">
    <ul :class="props.nestedFieldsData[field.key]?.length !== 0 ? 'dark:bg-surface-700 p-3 rounded bg-surface-200' : ''">
      <li
        v-for="(value, nestedItemIndex) in props.nestedFieldsData[field.key]"
        :key="nestedItemIndex"
        class="remove-required flex w-full space-x-2"
      >
        <div class="grow rounded">
          <IftaLabel>
            <label :for="props.field.fields[0]?.key">{{ props.field.fields[0]?.name }}</label>

            <template v-if="props.field.fields[0]?.type === FieldType.CHECKBOX">
              <InputText
                fluid readonly :value="formatItemValue(value, props.field.fields[0].fieldConfig.options)"
              />
            </template>

            <template v-else-if="props.field.fields[0]?.type === FieldType.IMAGE">
              <Image :src="String(formatItemValue(value))" />
            </template>

            <template v-else-if="props.isMultiLevel && props.field.fields[0]?.type === FieldType.NESTED">
              <template v-if="props.field.fields[0]?.fields[0]?.type === FieldType.CHECKBOX">
                <InputText
                  fluid readonly :value="formatItemValue(getFirstNestedItem(value, field.fields[0]!.key), props.field.fields[0].fields[0].fieldConfig.options)"
                />
              </template>
              <template v-else-if="props.field.fields[0]?.fields[0]?.type === FieldType.IMAGE">
                <Image :src="String(formatItemValue(getFirstNestedItem(value, field.fields[0]!.key)))" />
              </template>
              <template v-else>
                <InputText fluid readonly :value="formatItemValue(getFirstNestedItem(value, props.field.fields[0]!.key))" />
              </template>
            </template>

            <template v-else>
              <InputText fluid readonly :value="formatItemValue(value)" />
            </template>
          </IftaLabel>
        </div>

        <div class="flex grow-0 justify-around space-x-1">
          <Button
            severity="secondary" variant="text" size="small"
            @click="emits('edit', value, nestedItemIndex, props.isMultiLevel)"
          >
            <i class="i-[solar--pen-linear] text-lg" />
          </Button>
          <Button
            severity="secondary" variant="text" size="small"
            @click="emits('delete', nestedItemIndex)"
          >
            <i class="i-[solar--trash-bin-2-linear] text-lg" />
          </Button>
        </div>
      </li>
    </ul>
  </template>

  <div
    class="mt-2 box-border flex justify-center rounded px-2 py-1"
    :class="props.nestedFieldsData[field.key]?.length === 0
      ? 'border-dashed border-2' : ''"
  >
    <Button fluid rounded severity="secondary" class="text-sm" @click="emits('add', field, props.isMultiLevel)">
      Add new item
    </Button>
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
