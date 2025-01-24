<script setup lang="ts">
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import { type FieldConfig, FieldType } from "~/composables/project/model/project"
import { remapFieldValue, useProjectStore } from "~/composables/project/project"
import { useProjectData } from "~/composables/project/project-data"

const props = defineProps<{
  projectId: string
}>()

const emits = defineEmits<{
  edit: [dataId: string, coordinate: [number, number]]
}>()

const isLoadingData = ref(false)
const fields = ref<FieldConfig[]>([])
const data = ref<ProjectDataFeature[]>([])
const { projects, getById } = useProjectStore()
let projectData!: Awaited<ReturnType<typeof useProjectData>>

async function loadData() {
  const rows = (await projectData.getAll()).map((f) => remapFieldValue(fields.value, f))
  data.value = await Promise.all(rows)
}
async function deleteData(dataId: string) {
  await projectData.delete(dataId)
  await loadData()
}
onMounted(async () => {
  isLoadingData.value = true
  try {
    const project = await getById(props.projectId)
    if (project == null) {
      isLoadingData.value = false
      return
    }
    fields.value = project.fields

    projectData = useProjectData(props.projectId)
    await loadData()
  }
  catch (e) {
    captureToSentry(e)
  }
  finally {
    isLoadingData.value = false
  }
})
</script>

<template>
  <DataTable :value="data" :loading="isLoadingData">
    <template v-for="field in fields" :key="field.key">
      <Column :field="field.name" :header="field.name" style="min-width: 150px">
        <template v-if="field.type === FieldType.IMAGE" #body="slotProps">
          <Image :src="slotProps.data[field.name]" alt="Image" width="100" preview />
        </template>
      </Column>
    </template>
    <Column header="Action" style="min-width: 150px">
      <template #body="slotProps">
        <ButtonGroup>
          <Button
            severity="secondary" variant="text" size="small" @click="() => {
              deleteData(slotProps.data.id)
            }"
          >
            Delete
          </Button>
          <Button
            severity="secondary" variant="text" size="small" @click="() => {
              emits('edit', slotProps.data.id, slotProps.data.geom.coordinates as [number, number])
            }"
          >
            Edit
          </Button>
        </ButtonGroup>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>

</style>
