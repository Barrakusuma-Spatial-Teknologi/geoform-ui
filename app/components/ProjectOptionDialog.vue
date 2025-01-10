<script setup lang="ts">
import type { Project } from "~/composables/project/model/project"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectDataService } from "~/service/api/project"

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
    </template>

    <template v-if="!selectedProjectIsCollab">
      <li
        v-if="isInCloud"
        @click="() => {
          copySharedLink()
        }"
      >
        <div class="i-[solar--link-bold]" />
        <div>
          Copy project link
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
