<script setup lang="ts">
import type { FieldConfigSingularWrapper, FieldConfigWrapper } from "./formConfig"
import { type FieldConfigCheckbox, type FieldConfigNested, fieldOptions, FieldType } from "~/composables/project/model/project"
import { fieldOptionsWithoutNestedType } from "~/composables/project/model/project"

const emits = defineEmits<{
  remove: []
}>()

const field = defineModel<FieldConfigWrapper>("field", {
  required: true,
})

watch(
  () => field.value.type,
  () => {
    if (field.value.type === FieldType.NESTED) {
      addNewField()
    }
    else {
      if ("fields" in field.value) {
        delete field.value.fields
      }
    }
  },
)

watch(field.value, () => {
  field.value.dirty = true
})

function addNewField(): void {
  const key = generateLighterId()

  if (field.value.type === FieldType.NESTED) {
    field.value.fields.push({
      key,
      name: "",
      required: false,
      type: FieldType.TEXT,
      fieldConfig: {},
    })
  }

  nextTick()
}

onMounted(() => {
  if (field.value.type !== FieldType.NESTED) {
    return
  }

  if (field.value.fields != null) {
    return
  }

  field.value.fields = []
  addNewField()
})
</script>

<template>
  <div class="mb-4 box-border w-full space-y-2 rounded-lg bg-surface-300 px-4 py-2 dark:bg-surface-800">
    <IftaLabel fluid class="">
      <InputText :id="field!.key" v-model.lazy="field!.name" size="small" fluid />
      <label :for="field.key">Label</label>
    </IftaLabel>

    <IftaLabel fluid>
      <Select
        v-model="field!.type" input-id="field-type" :options="fieldOptions" class="w-full" variant="filled"
        @update:model-value="(v) => {
          if (v === FieldType.CHECKBOX) {
            (field as FieldConfigCheckbox).fieldConfig = {
              options: [{
                key: generateLighterId(),
                value: '',
              }],
              multiple: true,
            }
          }
          else {
            if ('fieldConfig' in field) {
              field!.fieldConfig = {}
            }
          }
        }"
      />
      <label for="field-type">Type</label>
    </IftaLabel>

    <template v-if="field.type === FieldType.NESTED">
      <div class="max-h-60 overflow-y-auto">
        <template v-for="(_field, index) in field.fields" :key="index">
          <ProjectConfigFormFieldSingular
            v-model:field="(field.fields[index]! as FieldConfigSingularWrapper)"
            :field-options="fieldOptionsWithoutNestedType"
            @remove="() => {
              (field as FieldConfigNested).fields.splice(index, 1)
            }"
          />
        </template>
      </div>
    </template>

    <div class="box-border px-2 py-1">
      <Button rounded severity="secondary" fluid @click="addNewField">
        Add new field
      </Button>
    </div>
    <CommonPanel class="rounded-lg bg-surface-950">
      <template #title>
        <div class="text-sm">
          Advanced Configuration
        </div>
      </template>

      <div class="box-border w-full px-2 pb-2">
        <template v-if="field.type === FieldType.NESTED">
          <InputGroup>
            <IftaLabel>
              <InputNumber
                size="small"
                locale="id-ID"
                :default-value="field?.fieldConfig?.minItem"
                @value-change="(v) => {
                  if ('fieldConfig' in field) {
                    (field.fieldConfig as NonNullable<FieldConfigNested['fieldConfig']>).minItem = v
                  }
                }"
              />
              <label>Min Item</label>
            </IftaLabel>
          </InputGroup>
        </template>
      </div>
    </CommonPanel>
    <div class="flex w-full justify-between border-t border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-2  text-sm">
        <Checkbox :id="`${field.key}_required`" v-model="field!.required" binary />
        <label :for="`${field.key}_required`"> Required </label>
      </div>

      <Button
        size="small" variant="text" severity="secondary" :disabled="field.strictChange" @click="() => {
          emits('remove')
        }"
      >
        <i class="i-[solar--trash-bin-trash-bold] text-lg" />
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
