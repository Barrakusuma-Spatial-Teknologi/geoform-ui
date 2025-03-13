<script setup lang="ts">
import type { FieldConfigWrapper } from "~/components/ProjectConfig/formConfig"

import FormFieldSingular from "~/components/ProjectConfig/FormFieldSingular.vue"
import { fieldOptions, FieldType } from "~/composables/project/model/project"

const emits = defineEmits<{
  remove: []
}>()

const field = defineModel<FieldConfigWrapper>("field", {
  required: true,
})
</script>

<template>
  <div :id="`${field.key}_container`" class="w-full">
    <template v-if="field.type === FieldType.NESTED">
      <ProjectConfigFormFieldNested v-model:field="field" @remove="emits('remove')" />
    </template>
    <template v-else>
      <FormFieldSingular v-model:field="field" :field-options="fieldOptions" @remove="emits('remove')" />
    </template>
  </div>
</template>

<style scoped>

</style>
