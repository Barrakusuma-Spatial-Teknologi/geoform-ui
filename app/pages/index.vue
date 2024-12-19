<script setup lang="ts">
import type { FeatureCollection } from "geojson"
import type { Popover } from "primevue"
import { useProjectStore } from "~/composables/project"
import { useProjectData } from "~/composables/project/project-data"

// const projects = ref<Project[]>(dummyProject)

const { projects } = useProjectStore()
const projectOptionPopoverRef = ref<InstanceType<typeof Popover>>()
function openOption() {
  projectOptionPopoverRef.value?.open()
}

function createNew() {
  navigateTo("/projects/0")
}

function openProject(index: number) {
  navigateTo(`/projects/${index}`)
}

function startProject(index: number) {
  navigateTo(`/projects/${index}/survey`)
}

usePermission("geolocation")
usePermission("camera")

const selectedProjectIndex = ref<number>()
async function exportGeoJSON() {
  if (selectedProjectIndex.value == null) {
    return
  }

  const project = projects.value[selectedProjectIndex.value]
  if (project == null) {
    return
  }

  const projectData = useProjectData(project.key)
  const data = await projectData.getAll()
  const featuresCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: data.map((item) => ({
      type: "Feature",
      id: item.id,
      geometry: {
        type: "Point",
        coordinates: [item.feature.lng, item.feature.lat],
      },
      properties: item.feature,
    })),
  }

  const text = JSON.stringify(featuresCollection)
  const blob = new Blob([text], { type: "application/json" })
  const link = document.createElement("a")

  link.download = `project_${project.name}_${Date.now()}.geojson`
  link.href = URL.createObjectURL(blob)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="relative flex size-full flex-col">
    <Popover ref="projectOptionPopoverRef">
      <ul class="space-y-2">
        <li @click="exportGeoJSON">
          Export
        </li>
        <li>Delete</li>
      </ul>
    </Popover>

    <div class="box-border grow basis-0 overflow-y-auto px-6 pb-6">
      <ul class="space-y-4">
        <template v-for="(project, index) in projects" :key="project.name">
          <li class="relative box-border w-full rounded-lg bg-surface-300 px-4 py-2 dark:bg-surface-800">
            <div class="mb-1 flex w-full items-center justify-between font-bold">
              <div>{{ project.name }}</div>

              <Button severity="warn" size="small" variant="text" @click="startProject(index + 1)">
                <i class="i-[solar--play-bold]" />
                Survey
              </Button>
            </div>

            <div class="flex w-full items-center justify-between">
              <div class="text-xs">
                {{ project.lastModified }}
              </div>

              <Button
                severity="secondary" size="small" variant="text" @click="(e) => {
                  selectedProjectIndex = index
                  projectOptionPopoverRef?.toggle(e)
                }"
              >
                <i class="i-[solar--menu-dots-bold] rotate-90" />
              </Button>
            </div>

            <!--            <button -->
            <!--              text severity="secondary" size="small" class="absolute right-2 top-2" @click="(e) => { -->
            <!--                projectOptionPopoverRef?.toggle(e) -->
            <!--              }" -->
            <!--            > -->
            <!--              <i class="i-[solar&#45;&#45;menu-dots-bold] rotate-90" /> -->
            <!--            </button> -->
          </li>
        </template>
      </ul>
    </div>

    <div class="box-border flex items-center justify-center pb-8">
      <Button @click="createNew">
        Create new project
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
