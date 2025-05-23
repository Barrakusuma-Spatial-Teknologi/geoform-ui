<script setup lang="ts">
import type { NestedEditValue, NestedItemValue } from "./type"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import FormInputSingular from "./FormInputSingular.vue"

const props = defineProps<{
  itemValue: NestedEditValue
}>()

const emits = defineEmits<{
  addItemData: [nestedFieldData: NestedItemValue, nestedItemKey: string, index?: number]
  close: []
}>()

const validationSchema = ref(zodResolver(createZodSchema(props.itemValue.config.fields)))
const formRef = ref<InstanceType<typeof PvForm>>()
const toast = useToast()
function save(e: FormSubmitEvent) {
  if (!e.valid) {
    toast.add({
      severity: "error",
      summary: "Invalid data",
    })
    return
  }

  if (props.itemValue.index !== undefined) {
    emits("addItemData", e.values, props.itemValue.config.key, props.itemValue.index)
    return
  }

  emits("addItemData", e.values, props.itemValue.config.key)
}

function handleCancelButton() {
  emits("close")
}

const initialValues = computed(() => {
  return props.itemValue.index !== undefined ? props.itemValue.item : {}
})
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-200 p-4 dark:bg-surface-900">
    <div class="mb-5 font-bold" :class="[props.itemValue?.config.required ? 'required' : '']">
      Add item of {{ props.itemValue?.config.name }}
    </div>
    <PvForm
      v-slot="$form"
      ref="formRef" :initial-values="initialValues || {}" class="flex w-full grow flex-col"
      :resolver="validationSchema"
      @submit="save"
    >
      <ul class="box-border flex w-full grow basis-0 flex-col space-y-4 overflow-y-auto pb-8 pt-2">
        <li
          v-for="(childField) in props.itemValue?.config.fields" :key="childField.key"
          :class="[childField.required ? 'required' : '']"
        >
          <FormInputSingular :field="childField" :form="$form" />
        </li>
      </ul>

      <div class="flex w-full justify-between gap-4">
        <Button
          class="grow-0" variant="text" severity="secondary" @click="handleCancelButton"
        >
          Cancel
        </Button>
        <Button class="grow font-bold" type="submit">
          Save
        </Button>
      </div>
    </PvForm>
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
