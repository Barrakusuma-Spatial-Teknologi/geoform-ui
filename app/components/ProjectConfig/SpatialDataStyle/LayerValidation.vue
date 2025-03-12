<script setup lang="ts">
import type { LayerValidationConfig } from "~/composables/project/model/project-layer"

const validation = defineModel<LayerValidationConfig>("value", {
  required: true,
})
const options = ref([
  {
    label: "Off",
    value: "off",
  },
  {
    label: "Forbidden",
    value: "forbidden",
  },
  {
    label: "Inside",
    value: "inside",
  },
])

const selected = ref<string>()
watch(selected, (newVal?: string) => {
  validation.value = {
    mode: newVal as LayerValidationConfig["mode"] ?? "off",
  }
})

onMounted(() => {
  selected.value = validation.value?.mode
})
</script>

<template>
  <IftaLabel>
    <SelectButton v-model="selected" class="mt-6" :options="options" option-label="label" option-value="value" data-key="value" aria-labelledby="custom">
      <template #option="slotProps">
        <div>{{ slotProps.option.label }}</div>
      </template>
    </SelectButton>
    <label for="labelFields">Validation</label>
  </IftaLabel>
  <div class="flex flex-col" />
</template>

<style scoped>

</style>
