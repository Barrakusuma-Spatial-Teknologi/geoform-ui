<script setup lang="ts">
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectService } from "~/service/api/project"

const props = defineProps<{
  projectId: string
  projectName: string
}>()

const emits = defineEmits<{
  close: []
}>()

const quota = ref<number>()

const blocker = useUiBlocker()
const toast = useToast()

async function shareProject() {
  blocker.show()

  try {
    await ProjectService.saveToCloud(props.projectId, quota.value)
    toast.add({
      severity: "success",
      summary: "Project shared successfully",
      life: 3000,
    })
    emits("close")
  }
  catch (e) {
    console.error(e)
    toast.add({
      severity: "error",
      summary: "Failed to share project",
      life: 3000,
    })
  }
  finally {
    blocker.hide()
  }
}
</script>

<template>
  <div class=" flex flex-col space-y-4">
    <IftaLabel fluid>
      <InputText id="quota" readonly :value="props.projectName" fluid />
      <label for="quota">Project Name</label>
    </IftaLabel>
    <IftaLabel fluid>
      <InputNumber id="quota" v-model="quota" fluid placeholder="Optional" />
      <label for="quota">Participant Quota</label>
    </IftaLabel>

    <div class="text-xs">
      Set a participant quota to allow others to join or leave it blank to make it private
    </div>
    <div class="flex justify-end gap-2">
      <Button type="button" label="Cancel" severity="secondary" @click="emits('close')" />
      <Button type="button" @click="shareProject">
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
