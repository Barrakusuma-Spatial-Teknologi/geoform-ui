<script setup lang="ts">
import type { Project } from "~/composables/project/model/project"
import { useDb } from "~/composables/project/db"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectDataService, ProjectService } from "~/service/api/project"

const props = defineProps<{
  project: Project
}>()

const emits = defineEmits<{
  edit: []
  saveCloud: []
  exportData: []
  deleteProject: []
}>()

const selectedProjectIsCollab = computed(() => {
  return props.project?.isCollaboration ?? false
})

const isInCloud = computed(() => {
  return props.project.syncAt != null
})

const clipboard = useClipboard()
const toast = useToast()
function copySharedLink() {
  clipboard.copy(`${window.location.origin}/projects/${props.project.id}/join`)
  toast.add({
    severity: "success",
    summary: "URL copied to clipboard",
    life: 3000,
  })
}

const blocker = useUiBlocker()
async function submitData() {
  blocker.show("Submitting image")

  try {
    await ProjectDataService.submitAllImage(props.project.id)
  }
  catch (e) {
    blocker.hide()
    console.error(e)
    toast.add({
      summary: "Failed to submit image",
      severity: "error",
      closable: true,
    })
    return
  }

  blocker.show("Submitting data")
  try {
    await ProjectDataService.sync(props.project.id)
    toast.add({
      summary: "Data submitted successfully!",
      severity: "success",
      closable: true,
      life: 6000,
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      summary: "Failed to submit data",
      severity: "error",
      closable: true,
    })
  }
  finally {
    blocker.hide()
  }
}

async function syncProject() {
  blocker.show("Syncing project configuration...")
  try {
    await ProjectService.update(props.project.id)
  }
  catch (e) {
    console.error(e)
    toast.add({
      summary: "Failed to sync project",
      severity: "error",
      closable: true,
    })
    blocker.hide()
    return
  }

  await submitData()
}

async function syncProjectCollaboration() {
  blocker.show("Fetching project configuration...")

  try {
    const projectRes = await ProjectService.getById(props.project.id)
    const project = projectRes.data

    const syncAt = Date.now()

    const layerRes = await ProjectService.getLayers(project.id)
    const layers = layerRes.data

    const db = useDb()
    await useDb().transaction("rw?", [db.project, db.projectLayer], async (tx) => {
      await db.project.update(project.id, {
        syncAt,
        createdAt: syncAt,
        participantQuota: project.participantQuota,
        fields: project.fields,
        name: project.title,
        isCollaboration: true,
        createdBy: project.createdBy,
        participantNum: project.participantNum,
        versionId: project.versionId,
      })

      blocker.show("Saving project layers")

      await db.projectLayer.filter((layer) => layer.projectId === project.id).delete()
      await db.projectLayer.bulkAdd(layers)
    })

    toast.add({
      severity: "success",
      summary: "Successfully sync project",
      life: 3000,
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      severity: "error",
      summary: "Failed to update project",
      life: 3000,
    })
  }
  finally {
    blocker.hide()
  }
}

const manageAccessVisible = ref(false)
</script>

<template>
  <ul class="space-y-2">
    <li
      v-if="!selectedProjectIsCollab"
      @click="() => {

        emits('edit')
      }"
    >
      <div class="i-[solar--pen-bold]" />

      <div>
        Edit
      </div>
    </li>
    <template v-if="selectedProjectIsCollab || isInCloud">
      <li
        @click="submitData"
      >
        <div class="i-[solar--plain-bold]" />
        <div>
          Submit data
        </div>
      </li>
      <li v-if="selectedProjectIsCollab" @click="() => { syncProjectCollaboration() }">
        <div class="i-[solar--cloud-download-bold]" />
        <div>
          Sync project from cloud
        </div>
      </li>
    </template>

    <template v-if="!selectedProjectIsCollab">
      <li v-if="isInCloud" @click="() => { syncProject() }">
        <div class="i-[solar--refresh-bold]" />
        <div>
          Sync project
        </div>
      </li>

      <li
        v-if="isInCloud"
        @click="() => {
          manageAccessVisible = true
        }"
      >
        <Dialog v-model:visible="manageAccessVisible" modal header="Manage access" :style="{ width: '25rem' }">
          <div v-if="manageAccessVisible" class="h-[500px]">
            <ManageAccess :project-id="props.project.id" />
          </div>
        </Dialog>

        <div class="i-[solar--share-bold]" />
        <div>
          Manage access
        </div>
      </li>

      <!--      <li -->
      <!--        v-if="isInCloud" -->
      <!--        @click="() => { -->
      <!--          copySharedLink() -->
      <!--        }" -->
      <!--      > -->
      <!--        <div class="i-[solar&#45;&#45;link-bold]" /> -->
      <!--        <div> -->
      <!--          Copy project link -->
      <!--        </div> -->
      <!--      </li> -->
      <!--      <li -->
      <!--        v-if="isInCloud" -->
      <!--        @click="() => { -->
      <!--          copySharedLink() -->
      <!--        }" -->
      <!--      > -->
      <!--        <div class="i-[solar&#45;&#45;link-bold]" /> -->
      <!--        <div> -->
      <!--          Project participant -->
      <!--        </div> -->
      <!--      </li> -->
      <li
        v-else
        @click="() => {
          emits('saveCloud')
        }"
      >
        <div class="i-[solar--cloud-upload-bold]" />
        <div>
          Save to cloud
        </div>
      </li>
    </template>

    <li @click="emits('exportData')">
      <div class="i-[solar--export-bold]" />
      <div>
        Export
      </div>
    </li>

    <li @click="emits('deleteProject')">
      <div class="i-[solar--trash-bin-2-bold]" />
      <div>
        Delete
      </div>
    </li>
  </ul>
</template>

<style scoped>
ul > li:not(:last-child) {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-700);
}

ul > li {
  display: flex;
  @apply space-x-4 items-center;
}

li > div:not(:last-child) {
  @apply text-lg text-surface-300/70;
}
</style>
