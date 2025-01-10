<script setup lang="ts">
import { nanoid } from "nanoid"
import { type FieldConfigCheckbox, type FieldConfigSingular, fieldOptions, FieldType } from "~/composables/project/model/project"

const emits = defineEmits<{
  remove: []
}>()

const field = defineModel<FieldConfigSingular>("field", {
  required: true,
})

onMounted(() => {
  document.getElementById("addFieldButton")?.scrollIntoView({
    behavior: "smooth", // Smooth scrolling animation
    block: "nearest", // Align child within the parent container
    inline: "start", // Align horizontally if applicable
  })
})
</script>

<template>
  <div :id="`${field.key}_container`" class="mb-4 box-border w-full space-y-2 rounded-lg bg-surface-300 px-4 py-2 dark:bg-surface-800">
    <IftaLabel fluid class="">
      <InputText :id="field!.key" v-model.lazy="field!.name" size="small" fluid />
      <label :for="field.key">Label</label>
    </IftaLabel>

    <IftaLabel fluid>
      <Select
        v-model="field!.type" input-id="field-type" :options="fieldOptions" class="w-full" variant="filled"
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
            field!.fieldConfig = undefined
          }
        }"
      />
      <label for="field-type">Type</label>
    </IftaLabel>

    <template v-if="field!.type === FieldType.CHECKBOX && field!.fieldConfig != null">
      <div class="flex items-center gap-2 py-2">
        <Checkbox v-model="(field as FieldConfigCheckbox)!.fieldConfig.multiple" binary />
        <label> Multiple </label>
      </div>

      <template v-for="(item, optionIndex) in field!.fieldConfig.options" :key="item.key">
        <InputGroup>
          <InputText :id="item.key" v-model="item.value" size="small" fluid />
          <InputGroupAddon>
            <Button
              size="small" variant="text" severity="secondary" @click="() => {
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
          field!.fieldConfig?.options.push({
            key: nanoid(),
            value: '',
          })
        }"
      >
        <Button rounded severity="secondary" size="small">
          Add new option
        </Button>
      </div>
    </template>

    <div class="flex w-full justify-between border-t border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-2">
        <Checkbox :id="`${field.id}_required`" v-model="field!.required" binary />
        <label :for="`${field.id}_required`"> Required </label>
      </div>

      <Button
        size="small" variant="text" severity="secondary" @click="() => {
          emits('remove')
        }"
      >
        <i class="i-[solar--trash-bin-trash-bold] text-lg" />
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
