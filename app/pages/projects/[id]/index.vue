<script setup lang="ts">
import type { FieldConfig } from "~/composables/project"
import { nanoid } from "nanoid"
import { get } from "radash"
import { fieldOptions, FieldType, useProjectStore } from "~/composables/project"

const route = useRoute()
const projectId: string | null = get(route.params, "id")
const { projects } = useProjectStore()

const config = reactive({ title: "", key: "" })

const fields = ref<FieldConfig[]>([])

function addNewField(): void {
  fields.value.push({
    key: nanoid(),
    name: "",
    required: false,
    type: FieldType.TEXT,
  })
}

const { save, update } = useProjectStore()
function saveProject(): void {
  if (projectId == null || projectId === "0") {
    save({
      name: config.title,
      fields: toRaw(fields.value),
      key: nanoid(),
      createdAt: new Date().toUTCString(),
      lastModified: new Date().toUTCString(),
    })
  }
  else {
    const selected = projects.value[Number.parseInt(projectId) - 1]
    update({
      name: config.title,
      fields: toRaw(fields.value),
      key: config.key,
      lastModified: new Date().toUTCString(),
      createdAt: selected!.createdAt,
    })
  }

  navigateTo("/")
}

onMounted(() => {
  if (projectId == null || projectId === "0") {
    return
  }

  const selected = projects.value[Number.parseInt(projectId) - 1]
  if (!selected) {
    return
  }

  config.title = selected.name
  config.key = selected.key
  fields.value = selected.fields
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="box-border flex size-full grow basis-0 flex-col overflow-y-scroll px-4">
      <form class="mb-6 box-border flex size-full grow flex-col">
        <IftaLabel fluid class="mb-6 ">
          <InputText id="title" v-model="config.title" fluid />
          <label for="title">Title</label>
        </IftaLabel>

        <div class="mb-2">
          Fields
        </div>
        <div class="w-full grow basis-0 overflow-y-scroll ">
          <template v-for="field in fields" :key="field.key">
            <div class="mb-4 box-border w-full space-y-2 rounded-lg bg-surface-800 px-4 py-2">
              <IftaLabel fluid class="">
                <InputText :id="field.key" v-model.lazy="field.name" size="small" fluid />
                <label :for="field.key">Label</label>
              </IftaLabel>

              <IftaLabel fluid>
                <Select
                  v-model="field.type" input-id="dd-city" :options="fieldOptions" class="w-full" variant="filled"
                  @update:model-value="(v) => {
                    if (v === FieldType.CHECKBOX) {
                      field.optionConfig = {
                        options: [{
                          key: nanoid(),
                          value: '',
                        }],
                        multiple: true,
                      }
                    }
                    else {
                      field.optionConfig = undefined
                    }
                  }"
                />
                <label for="dd-city">Type</label>
              </IftaLabel>

              <template v-if="field.type === FieldType.CHECKBOX && field.optionConfig != null">
                <div class="flex items-center gap-2 py-2">
                  <Checkbox v-model="field.optionConfig.multiple" binary />
                  <label> Multiple </label>
                </div>

                <template v-for="(item, optionIndex) in field.optionConfig.options" :key="item.key">
                  <InputGroup>
                    <InputText :id="item.key" v-model="item.value" size="small" fluid />
                    <InputGroupAddon>
                      <Button
                        size="small" variant="text" severity="secondary" @click="() => {
                          field.optionConfig?.options.splice(optionIndex, 1)
                        }"
                      >
                        <i class="i-[solar--trash-bin-trash-bold] text-lg" />
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </template>

                <div
                  class="flex w-full justify-center" @click="() => {
                    field.optionConfig?.options.push({
                      key: nanoid(),
                      value: '',
                    })
                  }"
                >
                  <Button rounded severity="secondary">
                    Add new option
                  </Button>
                </div>
              </template>

              <div class="flex w-full justify-between border-t border-surface-700">
                <div class="flex items-center gap-2">
                  <Checkbox v-model="field.required" binary />
                  <label for="ingredient1"> Required </label>
                </div>

                <Button size="small" variant="text" severity="secondary">
                  <i class="i-[solar--trash-bin-trash-bold] text-lg" />
                </Button>
              </div>
            </div>
          </template>
        </div>
      </form>

      <div class="flex w-full grow-0 justify-center" @click="addNewField">
        <Button rounded severity="secondary">
          Add new field
        </Button>
      </div>
    </div>

    <div class="box-border flex w-full grow-0 items-center justify-center gap-2 p-4">
      <Button severity="secondary" @click="$router.push('/')">
        Back
      </Button>

      <Button fluid @click="saveProject">
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
