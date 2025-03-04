<script setup lang="ts">
import type { FieldConfigSingularWrapper } from "~/components/ProjectConfig/formConfig"
import { nanoid } from "nanoid"
import {
  type FieldConfigCheckbox,
  type FieldConfigDate,
  type FieldConfigImage,
  type FieldConfigNumber,
  type FieldConfigText,
  fieldOptions,
  FieldType,
} from "~/composables/project/model/project"

const emits = defineEmits<{
  remove: []
}>()

const field = defineModel<FieldConfigSingularWrapper>("field", {
  required: true,
})

watch(field.value, () => {
  field.value.dirty = true
})

const newlyAddedCheckboxOption = ref<string[]>([])

onMounted(() => {
  field.value.dirty = false
  document.getElementById("addFieldButton")?.scrollIntoView({
    behavior: "smooth", // Smooth scrolling animation
    block: "nearest", // Align child within the parent container
    inline: "start", // Align horizontally if applicable
  })
})
</script>

<template>
  <div
    :id="`${field.key}_container`"
    class="mb-4 box-border w-full space-y-2 rounded-lg bg-surface-300 px-4 pb-2 pt-4 dark:bg-surface-800"
  >
    <IftaLabel fluid class="">
      <InputText :id="field!.key" v-model.lazy="field!.name" size="small" fluid />
      <label :for="field.key">Label</label>
    </IftaLabel>

    <IftaLabel fluid>
      <Select
        v-model="field!.type"
        :disabled="field.strictChange"
        input-id="field-type"
        :options="fieldOptions"
        class="w-full" variant="filled"
        @update:model-value="(v) => {
          if (v === FieldType.CHECKBOX) {
            field!.fieldConfig = {
              options: [{
                key: nanoid(),
                value: '',
              }],
              multiple: true,
            }
          }
          else {
            field!.fieldConfig = {}
          }
        }"
      />
      <label for="field-type">Type</label>
    </IftaLabel>

    <template v-if="field!.type === FieldType.CHECKBOX && field!.fieldConfig != null">
      <div class="flex items-center gap-2 py-2">
        <Checkbox
          :id="field.key" v-model="(field as FieldConfigCheckbox)!.fieldConfig.multiple"
          :disabled="field.strictChange" binary
        />
        <label :for="field.key"> Multiple </label>
      </div>

      <template v-for="(item, optionIndex) in field!.fieldConfig.options" :key="item.key">
        <InputGroup>
          <InputText :id="item.key" v-model="item.value" size="small" fluid />
          <InputGroupAddon>
            <Button
              size="small" variant="text" severity="secondary"
              :disabled="field.strictChange && !newlyAddedCheckboxOption.includes(item.key)" @click="() => {
                field!.fieldConfig?.options.splice(optionIndex, 1)
              }"
            >
              <i class="i-[solar--trash-bin-trash-bold] text-lg" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </template>

      <div
        class="flex w-full justify-center" @click="() => {
          const key = generateLighterId()
          newlyAddedCheckboxOption.push(key)

          field!.fieldConfig!.options.push({
            key,
            value: '',
          })
        }"
      >
        <Button rounded severity="secondary" size="small">
          Add new option
        </Button>
      </div>
    </template>

    <template v-if="field.type === FieldType.NUMBER">
      <div class="flex items-center gap-2 py-1 text-sm">
        <Checkbox :id="`${field.key}_decimal`" v-model="field!.fieldConfig!.isFloat" binary />
        <label :for="`${field.key}_decimal`"> Allow decimal </label>
      </div>
    </template>

    <template
      v-if="field!.type !== FieldType.CHECKBOX && field!.type !== FieldType.BOOLEAN"
    >
      <CommonPanel class="rounded-lg bg-surface-950">
        <template #title>
          <div class="text-sm">
            Advanced Configuration
          </div>
        </template>

        <div class="box-border w-full px-2 pb-2">
          <template v-if="field!.type === FieldType.TEXT">
            <InputGroup>
              <IftaLabel>
                <InputNumber
                  size="small" :default-value="field?.fieldConfig?.minLength"
                  locale="id-ID"
                  @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigText['fieldConfig']>).minLength = v
                    }
                  }"
                />
                <label>Min length</label>
              </IftaLabel>

              <IftaLabel>
                <InputNumber
                  :default-value="field?.fieldConfig?.maxLength" size="small" @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigText['fieldConfig']>).maxLength = v
                    }
                  }"
                />
                <label>Max length</label>
              </IftaLabel>
            </InputGroup>
            <InputGroup>
              <IftaLabel>
                <InputText
                  fluid size="small" :default-value="field?.fieldConfig?.pattern"
                  @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigText['fieldConfig']>).pattern = v
                    }
                  }"
                />
                <label>Regex Pattern</label>
              </IftaLabel>
            </InputGroup>
          </template>

          <template v-else-if="field!.type === FieldType.IMAGE">
            <InputGroup>
              <IftaLabel>
                <InputNumber
                  size="small" locale="id-ID" :default-value="field?.fieldConfig?.maxSize"
                  @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigImage['fieldConfig']>).maxSize = v
                    }
                  }"
                />
                <label>Maximum size</label>
              </IftaLabel>

              <InputGroupAddon>
                MB
              </InputGroupAddon>
            </InputGroup>
          </template>

          <template v-else-if="field!.type === FieldType.NUMBER">
            <InputGroup>
              <IftaLabel>
                <InputNumber
                  size="small" :default-value="field?.fieldConfig?.min"
                  locale="id-ID"
                  @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigNumber['fieldConfig']>).min = v
                    }
                  }"
                />
                <label>Min</label>
              </IftaLabel>

              <IftaLabel>
                <InputNumber
                  :default-value="field?.fieldConfig?.max" size="small" @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigNumber['fieldConfig']>).max = v
                    }
                  }"
                />
                <label>Max</label>
              </IftaLabel>
            </InputGroup>
          </template>

          <template v-else-if="field!.type === FieldType.DATE">
            <InputGroup>
              <IftaLabel>
                <DatePicker
                  size="small"
                  :default-value="field?.fieldConfig?.minDate != null ? new Date(field!.fieldConfig!.minDate) : undefined"
                  locale="id-ID"
                  @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigDate['fieldConfig']>).minDate = (v as Date).toDateString()
                    }
                  }"
                />
                <label>Min date</label>
              </IftaLabel>

              <IftaLabel>
                <DatePicker
                  :default-value="field?.fieldConfig?.maxDate != null ? new Date(field!.fieldConfig!.maxDate) : undefined"
                  size="small" @value-change="(v) => {
                    if ('fieldConfig' in field) {
                      (field.fieldConfig as NonNullable<FieldConfigDate['fieldConfig']>).maxDate = (v as Date).toDateString()
                    }
                  }"
                />
                <label>Max</label>
              </IftaLabel>
            </InputGroup>
          </template>
        </div>
      </CommonPanel>
    </template>

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
