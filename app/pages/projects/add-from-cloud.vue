<script setup lang="ts">
import { useDb } from "~/composables/project/db"
import { useProjectStore } from "~/composables/project/project"
import { useProjectTags } from "~/composables/project/project-tags"
import { useUiBlocker } from "~/composables/ui/blocker"
import { type ProjectResponse, ProjectService } from "~/service/api/project"

definePageMeta({
  title: "Add From Cloud",
  backTo: "/",
})

const toast = useToast()
const blocker = useUiBlocker()
const projects = ref<ProjectResponse[]>([])

type FilterType = "created" | "collaboration"
const activeFilter = ref<FilterType>()

function activateFilter(type: FilterType) {
  if (activeFilter.value === type) {
    activeFilter.value = undefined
    return
  }

  activeFilter.value = type
}

const filteredProject = computed(() => {
  if (activeFilter.value == null) {
    return projects.value
  }

  if (activeFilter.value === "created") {
    return projects.value.filter((project) => !project.isCollaboration)
  }

  return projects.value.filter((project) => project.isCollaboration)
})

async function fetchAllProject() {
  blocker.show("Fetching all projects...")
  try {
    const res = await ProjectService.getAll()
    projects.value = res.data
  }
  catch (e) {
    console.error(e)
    toast.add({
      severity: "error",
      summary: "Failed to fetch all projects.",
      life: 3000,
    })
  }
  finally {
    blocker.hide()
  }
}

const selectedProject = ref<ProjectResponse>()
const addProjectDialogVisible = ref(false)
const projectStore = useProjectStore()
async function showAddProjectDialog(project: ProjectResponse) {
  const existing = await projectStore.getById(project.id)
  if (existing != null) {
    toast.add({
      severity: "error",
      summary: "Project already exists",
      group: "bc",
    })
    return
  }

  addProjectDialogVisible.value = true
  selectedProject.value = project
}

async function addProjectToLocal() {
  const projectId = selectedProject.value?.id
  if (projectId == null) {
    return
  }
  blocker.show("Fetching project configuration...")

  try {
    blocker.show("Saving project config...")
    const projectRes = await ProjectService.getById(projectId)
    const project = projectRes.data
    const projectItem = projects.value.find((row) => row.id === projectId)!

    await projectStore.saveFromCloud(project, projectItem.isCollaboration)
    await useProjectTags(projectId).add(project.participantTags)

    blocker.show("Saving project layers")

    const layerRes = await ProjectService.getLayers(projectId)
    const layers = layerRes.data
    await useDb().projectLayer.bulkAdd(layers)
    addProjectDialogVisible.value = false
    toast.add({
      severity: "success",
      summary: `Project ${project.title} has been added successfully.`,
      group: "bc",
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      severity: "error",
      summary: "Failed to add project",
      life: 3000,
    })

    // cleanup on failure
    const stored = await useDb().project.get(projectId)
    if (stored != null) {
      await useDb().project.delete(projectId)
    }
  }
  finally {
    blocker.hide()
  }

  await fetchAllProject()
}

onMounted(async () => {
  await fetchAllProject()
})
</script>

<template>
  <div class="box-border flex size-full flex-col px-4 py-6">
    <div class="shrink-0 grow-0 pb-8">
      <FloatLabel class="mb-3" variant="on">
        <InputGroup>
          <InputText id="search-name" fluid />
          <InputGroupAddon>
            <i class="i-[solar--magnifer-linear]" />
          </InputGroupAddon>
        </InputGroup>

        <label for="search-name">Search name</label>
      </FloatLabel>

      <div class="filter-option flex items-center space-x-2 overflow-x-auto">
        <div class="px-2">
          <i class="i-[solar--filter-bold]" />
        </div>

        <Chip
          class="transition-all duration-300" :class="{
            '!bg-primary': activeFilter === 'created',
          }"
          label="Created"
          @click="activateFilter('created')"
        />
        <Chip
          class="transition-all duration-300" :class="{
            '!bg-primary': activeFilter === 'collaboration',
          }"
          label="Collaboration"
          :removable="activeFilter === 'collaboration'"
          @click="activateFilter('collaboration')"
        />
      </div>
    </div>

    <div class="shrink grow basis-0 overflow-y-auto">
      <ul v-if="filteredProject.length > 0" class="space-y-4">
        <Dialog v-model:visible="addProjectDialogVisible" modal :closable="false" header="Add Project">
          <div class="mb-4">
            Are you sure you want to add this project?
          </div>

          <IftaLabel v-if="selectedProject != null" class="mb-6 box-border">
            <InputText id="project-name" fluid size="small" :default-value="selectedProject.title" readonly />
            <label for="project-name">Project name</label>
          </IftaLabel>

          <template #footer>
            <div class="flex w-full">
              <Button text fluid @click="addProjectDialogVisible = false">
                No
              </Button>

              <Button fluid @click="addProjectToLocal">
                Yes
              </Button>
            </div>
          </template>
        </Dialog>

        <template v-for="project in filteredProject" :key="project.id">
          <li>
            <ProjectListItem
              :project="project" @click="() => {
                showAddProjectDialog(project)
              }"
            />
          </li>
        </template>
      </ul>

      <CommonEmpty v-else>
        No projects found.
      </CommonEmpty>
    </div>
  </div>
</template>
