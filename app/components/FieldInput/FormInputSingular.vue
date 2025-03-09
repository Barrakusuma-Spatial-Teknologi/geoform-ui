<script setup lang="ts">
import type { FormFieldState } from "@primevue/forms"
import { type FieldConfigSingular, FieldType } from "~/composables/project/model/project"

const props = defineProps<{
  field: FieldConfigSingular
  form: Record<string, FormFieldState>
}>()
</script>

<template>
  <template v-if="props.field.type === FieldType.TEXT">
    <div class="space-y-1">
      <label class="text-sm" :for="props.field.key">
        {{ props.field.name }}
      </label>
      <InputText :id="props.field.key" :name="props.field.key" fluid />
      <Message v-if="props.form[props.field.key]?.invalid" class="h-5" severity="error" size="small" variant="simple">
        {{ props.form[props.field.key]?.error?.message }}
      </Message>
    </div>
  </template>

  <template v-else-if="props.field.type === FieldType.NUMBER">
    <div class="space-y-1">
      <label class="text-sm" :for="props.field.key">
        {{ props.field.name }}
      </label>
      <InputNumber
        :id="props.field.key" :name="props.field.key" locale="id-ID"
        :min-fraction-digits="(props.field?.fieldConfig?.isFloat ?? false) ? 1 : 0"
        :max-fraction-digits="(props.field?.fieldConfig?.isFloat ?? false) ? 10 : 1"
        fluid
      />
      <Message v-if="props.form[props.field.key]?.invalid" severity="error" size="small" variant="simple">
        {{ props.form[props.field.key]?.error?.message }}
      </Message>
    </div>
  </template>

  <template v-else-if="props.field.type === FieldType.DATE">
    <div class="space-y-1">
      <label class="text-sm" :for="props.field.key">
        {{ props.field.name }}
      </label>
      <DatePicker :id="props.field.key" :name="props.field.key" fluid date-format="dd/mm/yy" />

      <Message v-if="props.form[props.field.key]?.invalid" severity="error" size="small" variant="simple">
        {{ props.form[props.field.key]?.error?.message }}
      </Message>
    </div>
  </template>

  <template v-else-if="props.field.type === FieldType.IMAGE">
    <div class="space-y-1">
      <label class="text-sm" :for="props.field.key">
        {{ props.field.name }}
      </label>
      <FormField v-slot="$field" :name="props.field.key" :initial-value="props.form[props.field.key]?.value">
        <FieldInputImage
          :id="props.field.key"
          :default-value="props.form[props.field.key]?.value"
          :config="props.field.fieldConfig"
          :prime-field="$field"
          @update:image="(value) => {
            // @ts-expect-error fast bypass
            $field.onInput({ data: value, value } as InputEvent)
          }"
        />

        <Message v-if="props.form[props.field.key]?.invalid" severity="error" size="small" variant="simple">
          {{ props.form[props.field.key]?.error?.message }}
        </Message>
      </FormField>
    </div>
  </template>

  <template v-else-if="props.field.type === FieldType.CHECKBOX">
    <div class="space-y-1">
      <label class="text-sm" :for="props.field.key">
        {{ props.field.name }}
      </label>
      <Listbox
        v-if="(props.field.fieldConfig?.options ?? []).length <= 4"
        :id="props.field.key" :name="props.field.key"
        :multiple="props.field.fieldConfig?.multiple ?? true"
        :options="props.field.fieldConfig?.options ?? []" option-label="value" option-value="key" class="w-full"
        fluid
      />
      <MultiSelect
        v-else-if="props.field.fieldConfig?.multiple ?? true"
        :id="props.field.key" :name="props.field.key"
        filter
        :options="props.field.fieldConfig?.options ?? []"
        option-label="value"
        option-value="key"
        class="w-full"
        fluid
      />
      <Select
        v-else
        :id="props.field.key" :name="props.field.key"
        filter
        :options="props.field.fieldConfig?.options ?? []"
        option-label="value"
        option-value="key"
        class="w-full"
        fluid
      />

      <Message v-if="props.form[props.field.key]?.invalid" severity="error" size="small" variant="simple">
        {{ props.form[props.field.key]?.error?.message }}
      </Message>
    </div>
  </template>

  <template v-else-if="props.field.type === FieldType.BOOLEAN">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <Checkbox :id="props.field.key" :name="props.field.key" binary />
        <label :for="props.field.key"> {{ props.field.name }} </label>
      </div>
      <Message v-if="props.form[props.field.key]?.invalid" severity="error" size="small" variant="simple">
        {{ props.form[props.field.key]?.error?.message }}
      </Message>
    </div>
  </template>
</template>

<style scoped>
li.required label:after {
  @apply text-red-400;
  content: " *";
}
</style>
