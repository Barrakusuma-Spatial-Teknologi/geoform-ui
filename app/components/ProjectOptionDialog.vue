<script setup lang="ts">
import type { Project } from "~/composables/project/model/project"
import { submitDataCloud } from "~/components/SurveyData/submitDataCloud"
import { useDb } from "~/composables/project/db"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectService } from "~/service/api/project"
import { captureToCloud } from "~/utils/captureToCloud"

const props = defineProps<{
  project: Project
}>()

const emits = defineEmits<{
  edit: []
  saveCloud: []
  exportData: []
  deleteProject: []
}>()

const confirm = useConfirm()

const selectedProjectIsCollab = computed(() => {
  return props.project?.isCollaboration ?? false
})

const isInCloud = computed(() => {
  return props.project?.syncAt != null
})

const toast = useToast()

const blocker = useUiBlocker()

const {
  coords,
} = useGeolocation({
  immediate: true,
  enableHighAccuracy: true,
})

async function submitData() {
  await submitDataCloud(props.project.id, toast, { longitude: coords.value.longitude, latitude: coords.value.latitude })
}

function confirmClearSubmitedData() {
  confirm.require({
    header: "Confirm",
    message: "Submitted data will be deleted and can not be undone",
    rejectProps: {
      label: "Cancel",
      outlined: true,
      size: "small",
    },
    acceptProps: {
      label: "Continue",
      size: "small",
    },
    accept: () => {
      clearSubmittedData()
    },
    reject: () => {},
  })
}

async function clearSubmittedData() {
  blocker.show("Checking pending changes...")

  try {
    const pendingId = (await useDb().changesHistory.filter((row) => row.projectId === props.project.id).toArray()).map((row) => row.dataId)

    blocker.show("Deleting images...")
    await useDb().image.filter((row) => row.syncAt != null && !pendingId.includes(row.projectDataId)).delete()

    blocker.show("Deleting data...")
    await useDb().projectData.filter((row) => row.syncAt != null && !pendingId.includes(row.id)).delete()
    toast.add({
      summary: "Submitted data cleared",
      severity: "success",
      closable: true,
      life: 6000,
    })
  }
  catch (e) {
    captureToCloud(e)
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
    toast.add({
      summary: "Failed to sync project",
      severity: "error",
      closable: true,
    })
    blocker.hide()
    captureToCloud(e)
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
    await useDb().transaction("rw?", [db.project, db.projectLayer], async (_tx) => {
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
    toast.add({
      severity: "error",
      summary: "Failed to update project",
      life: 3000,
    })
    captureToCloud(e)
  }
  finally {
    blocker.hide()
  }
}

const manageAccessVisible = ref(false)
</script>

<template>
  <ul class="space-y-2">
    <template v-if="!selectedProjectIsCollab">
      <li

        @click="() => {

          emits('edit')
        }"
      >
        <div class="i-[solar--pen-bold]" />

        <div>
          Edit
        </div>
      </li>

      <li

        @click="() => {
          navigateTo(`/projects/${props.project.id}/data`)
        }"
      >
        <div class="i-[solar--database-bold]" />

        <div>
          Show Data
        </div>
      </li>
    </template>

    <template v-if="selectedProjectIsCollab || isInCloud">
      <li
        @click="submitData"
      >
        <div class="i-[solar--plain-bold]" />
        <div>
          Submit data
        </div>
      </li>
      <li
        @click="() => {
          console.log('confirm')
          confirmClearSubmitedData()
        }"
      >
        <div class="i-[solar--clipboard-remove-bold]" />
        <div>
          Clear submitted data
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
ul > li:where([class~="dark"], [class~="dark"] *):not(:last-child) {
  border-bottom: 1px solid var(--p-surface-700);
}

ul > li:not(:last-child) {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--p-surface-300);
}

ul > li {
  display: flex;
  @apply space-x-4 items-center;
}

li > div:where([class~="dark"], [class~="dark"] *):not(:last-child) {
  @apply text-lg text-surface-300/70;
}

li > div:not(:last-child) {
  @apply text-lg text-surface-500/70;
}
</style>
