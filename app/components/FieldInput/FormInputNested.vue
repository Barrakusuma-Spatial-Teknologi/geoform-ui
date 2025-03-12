<script setup lang="ts">
import type { NestedEditValue, NestedItemValue } from "./Form.vue"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import FormInputSingular from "./FormInputSingular.vue"

const props = defineProps<{
  itemValue: NestedEditValue
}>()

const emits = defineEmits<{
  addItemData: [nestedFieldData: NestedItemValue, nestedItemKey: string, index?: number]
  closeForm: []
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
    emits("closeForm")
    return
  }

  emits("addItemData", e.values, props.itemValue.config.key)
  emits("closeForm")
}

function handleCancelButton() {
  emits("closeForm")
}

const initialValues = ref<Record<string, any>>()

watch(
  () => props.itemValue,
  () => {
    initialValues.value = props.itemValue.index !== undefined ? props.itemValue.item : {}
  },
  { immediate: true },
)
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
    <label class="text-sm" :class="[props.itemValue?.config.required ? 'required' : '']">
      {{ props.itemValue?.config.name }}
    </label>
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
