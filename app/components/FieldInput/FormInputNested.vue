<script setup lang="ts">
import type { NestedValue } from "./Form.vue"
import type { FieldConfigNested } from "~/composables/project/model/project"
import { type FormSubmitEvent, Form as PvForm } from "@primevue/forms"
import { zodResolver } from "@primevue/forms/resolvers/zod"
import { createZodSchema } from "~/components/FieldInput/form-validation"
import FormInputSingular from "./FormInputSingular.vue"

const props = defineProps<{
  nestedField: FieldConfigNested[]
}>()

const emits = defineEmits<{
  addNestedFieldData: [nestedFieldData: NestedValue, nestedItemKey: string]
  changeFormMode: [isNestedMode: boolean]
}>()

const editFieldValues = defineModel<Record<string, NestedValue>>("editFieldValues", {
  required: false,
})
const validationSchema = ref(zodResolver(createZodSchema(props.nestedField[0]!.fields)))
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

  emits("changeFormMode", false)
  const nestedItemKey = generateLighterId()

  if (!editFieldValues.value || Object.keys(editFieldValues.value).length === 0) {
    emits("addNestedFieldData", e.values, nestedItemKey)
    editFieldValues.value = {}
    return
  }

  emits("addNestedFieldData", e.values, Object.keys(editFieldValues.value)[0]!)
  editFieldValues.value = {}
}

function handleCancelButton() {
  emits("changeFormMode", false)
  editFieldValues.value = {}
}

const initialValues = computed(() => {
  if (!editFieldValues.value) {
    return {}
  }

  return { ...editFieldValues.value[Object.keys(editFieldValues.value)[0]!] }
})
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-100 p-4 dark:bg-surface-800">
    <label class="text-sm" :class="[props.nestedField[0]?.required ? 'required' : '']">
      {{ props.nestedField[0]?.name }}
    </label>
    <PvForm
      v-slot="$form"
      ref="formRef" :initial-values="initialValues || {}" class="flex w-full grow flex-col"
      :resolver="validationSchema"
      @submit="save"
    >
      <ul class="box-border flex w-full grow basis-0 flex-col space-y-4 overflow-y-auto pb-8 pt-2">
        <li
          v-for="(fieldChild) in props.nestedField[0]?.fields" :key="fieldChild.key"
          :class="[fieldChild.required ? 'required' : '']"
        >
          <FormInputSingular :field="fieldChild" :form="$form" />
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
