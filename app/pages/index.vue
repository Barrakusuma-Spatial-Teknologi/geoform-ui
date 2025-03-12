<script setup lang="ts">
import type { Feature, FeatureCollection } from "geojson"
import { UseTimeAgo } from "@vueuse/components"
import { get } from "radash"
import ProjectOptionDialog from "~/components/ProjectOptionDialog.vue"
import { FieldType } from "~/composables/project/model/project"
import { useProjectStore } from "~/composables/project/project"
import { useProjectData } from "~/composables/project/project-data"

// const projects = ref<Project[]>(dummyProject)

definePageMeta({
  backTo: "logout",
})

const {
  projects,
  remove,
} = useProjectStore()

const projectOptionVisible = ref(false)

const addProjectOptionVisible = ref(false)

function createNew() {
  navigateTo("/projects/new")
}

function openProject(index: string) {
  navigateTo(`/projects/${index}`)
}

function startProject(index: string) {
  navigateTo(`/projects/${index}/survey`)
}

const selectedProjectId = ref<string>()
const selectedProjectIndex = ref<number>()

const selectedProjectName = computed(() => {
  if (selectedProjectIndex.value == null) {
    return "Project option"
  }

  if (projects.value == null) {
    return "Project option"
  }

  const project = projects.value[selectedProjectIndex.value]
  return project?.name
})

async function deleteProject() {
  if (selectedProjectId.value == null) {
    return
  }

  await remove(selectedProjectId.value)
  projectOptionVisible.value = false
}

const shareProjectVisible = ref(false)

async function exportGeoJSON() {
  if (selectedProjectId.value == null) {
    return
  }

  if (projects.value == null) {
    return
  }

  const project = projects.value[selectedProjectIndex.value!]
  if (project == null) {
    return
  }

  const projectData = useProjectData(project.id)
  const data = await projectData.getAll()
  const featuresCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: await Promise.all(
      data.map(async (item) => {
        const properties: Feature["properties"] = {}
        for (const field of project.fields) {
          const fieldValue = get<string | undefined>(item.data.data, field.key)

          if (field.type === FieldType.IMAGE && fieldValue != null) {
            const image = await projectData.getImage(fieldValue)
            properties[field.key] = image ?? fieldValue
          }
          else {
            properties[field.key] = fieldValue
          }
        }

        return {
          type: "Feature",
          id: item.id,
          geometry: item.data.geom,
          properties,
        }
      }),
    ),
  }

  const text = JSON.stringify(featuresCollection)
  const blob = new Blob([text], { type: "application/json" })
  const link = document.createElement("a")

  link.download = `project_${project.name}_${Date.now()}.geojson`
  link.href = URL.createObjectURL(blob)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  projectOptionVisible.value = false
}
</script>

<template>
  <div class="relative flex size-full flex-col pt-4 md:pt-8">
    <NoticeDialog />

    <Dialog v-model:visible="shareProjectVisible" modal header="Save to cloud" :style="{ width: '25rem' }">
      <ShareProjectDialog
        v-if="selectedProjectId != null" :project-id="selectedProjectId"
        :project-name="selectedProjectName ?? ''"
        @close="() => {
          shareProjectVisible = false
        }"
      />
    </Dialog>

    <Drawer
      v-model:visible="projectOptionVisible"
      pt:mask:class="backdrop-blur-sm"
      class="xl:max-w-screen-md"
      position="bottom"
      style="height: auto"
      :header="selectedProjectName"
      :show-close-icon="false"
    >
      <ProjectOptionDialog
        v-if="selectedProjectIndex != null && selectedProjectId != null"
        :project="projects![selectedProjectIndex]!"
        @edit="openProject(selectedProjectId)"
        @save-cloud="shareProjectVisible = true"
        @export-data="exportGeoJSON"
        @delete-project="deleteProject"
      />
    </Drawer>

    <ProjectStorage class="mb-6 grow-0 px-6" />

    <div class="box-border grow basis-0 overflow-y-auto px-6 pb-6">
      <ul v-if="(projects?.length ?? -1) > 0" class="space-y-4">
        <template v-for="(project, index) in projects" :key="project.name">
          <li class="relative box-border flex w-full rounded-lg bg-surface-300 px-4 py-3 dark:bg-surface-800">
            <div class="grow space-y-2">
              <div class="flex w-full items-center justify-between font-bold" @click="startProject(project.id)">
                <div>{{ project.name }}</div>
              </div>

              <div class="flex w-full items-center space-x-4 text-xs">
                <div class="text-surface-800/60 dark:text-surface-400">
                  <UseTimeAgo v-slot="{ timeAgo }" :time="project.updatedAt ?? project.createdAt">
                    Last modified {{ timeAgo }}
                  </UseTimeAgo>
                </div>

                <div class="font-bold text-surface-800/60 dark:text-surface-400">
                  <template v-if="project.isCollaboration">
                    COLLABORATION
                  </template>
                  <template v-else-if="project.syncAt != null">
                    <template v-if="project.participantQuota != null && project.participantQuota > 0">
                      PUBLIC
                    </template>
                    <template v-else>
                      PRIVATE
                    </template>
                  </template>
                  <template v-else>
                    LOCAL
                  </template>
                </div>
              </div>
            </div>
            <div class="flex grow-0 items-center">
              <Button
                text
                severity="primary"
                rounded size="small" @click="(e) => {
                  selectedProjectId = project.id
                  selectedProjectIndex = index
                  projectOptionVisible = true
                  projectOptionPopoverRef?.toggle(e)
                }"
              >
                <template #icon>
                  <i class="i-[solar--menu-dots-bold] rotate-90 text-4xl" />
                </template>
              </Button>
            </div>
          </li>
        </template>
      </ul>
      <div v-else class="flex size-full flex-col items-center justify-center" @click="createNew">
        <div class="mb-2 flex items-center text-[100px]">
          <i class="i-[solar--folder-open-line-duotone] text-surface-700" />
        </div>

        <div class="text-sm">
          No project yet, click to create new project
        </div>
      </div>
    </div>

    <Drawer
      v-model:visible="addProjectOptionVisible"
      pt:mask:class="backdrop-blur-sm"
      class="rounded-t-xl xl:max-w-screen-md"
      position="bottom"
      style="height: auto"
      header="Add project"
      show-close-icon
    >
      <ul class="addProjectList">
        <li v-ripple @click="createNew">
          <div class="icon i-[solar--add-square-bold]" />
          <div>Create new project</div>
        </li>
        <li
          v-ripple @click="() => {
            navigateTo('/projects/join-id')
          }"
        >
          <div class="icon i-[solar--add-square-bold-duotone]" />
          <div>Join by Project ID</div>
        </li>
        <li
          v-ripple
          @click="() => {
            navigateTo('/projects/add-from-cloud')
          }"
        >
          <div class="icon i-[solar--cloud-bolt-minimalistic-bold]" />
          <div>Add project from cloud</div>
        </li>
      </ul>
    </Drawer>

    <div class="box-border flex items-center justify-center pb-6">
      <Button @click="addProjectOptionVisible = true">
        <div class="i-[material-symbols--add-2-rounded]" />
        Add project
      </Button>
    </div>
  </div>
</template>

<style scoped>
ul.addProjectList > li {
  @apply flex items-center space-x-2  py-4;
}

ul.addProjectList > li > div.icon {
  @apply text-2xl;
}

ul.addProjectList > li:not(:last-child) {
  border-bottom: 1px solid var(--p-surface-700);
}
</style>
