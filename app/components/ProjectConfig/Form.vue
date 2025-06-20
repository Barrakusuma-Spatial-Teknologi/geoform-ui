<script setup lang="ts">
import type { FieldConfigWrapper, FormConfig } from "~/components/ProjectConfig/formConfig"
import { FieldType } from "~/composables/project/model/project"
import { generateLighterId } from "~/utils/generateId"

const config = defineModel<FormConfig>("config", {
  default: {
    key: "",
    title: "",
    maxDistanceInMeter: undefined,
  },
})
const fields = defineModel<FieldConfigWrapper[]>("fields", {
  default: [] as FieldConfigWrapper[],
})

const addFieldButtonRef = ref<HTMLDivElement>()

function addNewField(): void {
  const key = generateLighterId()

  fields.value.push({
    key,
    name: "",
    required: false,
    type: FieldType.TEXT,
    fieldConfig: {},
    dirty: false,
  })

  nextTick()
}
</script>

<template>
  <div class="box-border flex size-full grow basis-0 flex-col overflow-y-scroll px-4">
    <form class="mb-6 box-border flex size-full grow flex-col">
      <IftaLabel fluid class="mb-6 ">
        <InputText id="title" v-model="config.title" fluid />
        <label for="title">Title</label>
      </IftaLabel>

      <IftaLabel fluid class="mb-6">
        <InputNumber
          id="maxDistanceInMeter" v-model="config.maxDistanceInMeter" fluid
          :invalid="config.maxDistanceInMeter != null && config.maxDistanceInMeter < 0.01"
          :max-fraction-digits="2"
          :min="0.01"
        />
        <label for="maxDistanceInMeter">Max Distance In Meter</label>
      </IftaLabel>

      <div class="mb-2">
        Fields
      </div>
      <div class="w-full grow basis-0 overflow-y-scroll ">
        <template v-for="(field, fieldIndex) in fields" :key="field.key">
          <ProjectConfigFormField
            v-model:field="fields[fieldIndex]!"
            @remove="() => {
              fields.splice(fieldIndex, 1)
            }"
          />
        </template>

        <div id="addFieldButton" ref="addFieldButtonRef" class="box-border px-2 py-1">
          <Button rounded severity="secondary" fluid @click="addNewField">
            Add new field
          </Button>
        </div>
      </div>
    </form>

    <div class="flex w-full grow-0 justify-center">
      <!--      <Button rounded severity="secondary" @click="addNewField"> -->
      <!--        Add new field -->
      <!--      </Button> -->
    </div>
  </div>
</template>

<style scoped>

</style>
