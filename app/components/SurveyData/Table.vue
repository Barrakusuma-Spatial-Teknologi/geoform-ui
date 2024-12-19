<script setup lang="ts">
import { type FieldConfig, FieldType, useProjectStore } from "~/composables/project"
import { type ProjectDataFeature, useProjectData } from "~/composables/project/project-data"

const props = defineProps<{
  projectId: string
}>()

const fields = ref<FieldConfig[]>([])
const data = ref<ProjectDataFeature[]>([])
const { projects } = useProjectStore()
onMounted(async () => {
  const project = projects.value.find((p) => p.key === props.projectId)
  if (project == null) {
    return
  }
  fields.value = project.fields

  const projectData = useProjectData(props.projectId)
  data.value = (await projectData.getAll()).map((f) => f.feature)
})
</script>

<template>
  <DataTable :value="data">
    <template v-for="field in fields" :key="field">
      <Column :field="field.name" :header="field.name" style="min-width: 150px">
        <template v-if="field.type === FieldType.IMAGE" #body="slotProps">
          <Image :src="slotProps.data[field.name]" alt="Image" width="100" preview />
        </template>
      </Column>
    </template>
    <Column header="Action" style="min-width: 150px">
      <template #body>
        <ButtonGroup>
          <Button severity="secondary" variant="text" size="small">
            Delete
          </Button>
          <Button severity="secondary" variant="text" size="small">
            Edit
          </Button>
        </ButtonGroup>
      </template>
    </Column>
  </DataTable>
</template>

<style scoped>

</style>
