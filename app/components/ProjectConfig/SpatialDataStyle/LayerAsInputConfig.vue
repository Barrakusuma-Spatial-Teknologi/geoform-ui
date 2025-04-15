<script setup lang="ts">
import type { LayerDataAsInput } from "~/composables/project/model/project-layer"

const props = defineProps<{
  fields: { label: string, value: string }[]
}>()

const inputConfig = defineModel<LayerDataAsInput>("value", {
  required: true,
})

const selected = ref<string>()
watch(selected, (newVal?: string) => {
  inputConfig.value = {
    field: newVal,
  }
})

onMounted(() => {
  selected.value = inputConfig.value?.field
})
</script>

<template>
  <IftaLabel>
    <Select
      v-model="selected"
      :options="props.fields" option-value="value" option-label="label" fluid
    />
    <label for="labelFields">Use field as input</label>
  </IftaLabel>
  <div class="flex flex-col" />
</template>
