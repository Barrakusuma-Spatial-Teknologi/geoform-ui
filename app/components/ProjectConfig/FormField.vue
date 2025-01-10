<script setup lang="ts">
import FormFieldSingular from "~/components/ProjectConfig/FormFieldSingular.vue"
import { type FieldConfig, type FieldConfigCheckbox, fieldOptions, FieldType } from "~/composables/project/model/project"

const emits = defineEmits<{
  remove: []
}>()

const field = defineModel<FieldConfig>("field", {
  required: true,
})
</script>

<template>
  <div :id="`${field.key}_container`" class="w-full">
    <template v-if="field.type === FieldType.NESTED">
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
                  field!.fieldConfig = undefined
                }
              }
            }"
          />
          <label for="field-type">Type</label>
        </IftaLabel>
      </div>
    </template>
    <template v-else>
      <FormFieldSingular v-model:field="field" @remove="emits('remove')" />
    </template>
  </div>
</template>

<style scoped>

</style>
