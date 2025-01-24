<script setup lang="ts">
import * as Sentry from "@sentry/nuxt"
import { get } from "es-toolkit/compat"
import LoginForm from "~/components/common/LoginForm.vue"
import { useAuth } from "~/composables/auth"
import { useDb } from "~/composables/project/db"
import { useProjectStore } from "~/composables/project/project"
import { useUiBlocker } from "~/composables/ui/blocker"
import { type ProjectResponse, ProjectService } from "~/service/api/project"
import { tryGetFetchError } from "~/utils/tryGetFetchError"

definePageMeta({
  backTo: "/",
  requiresAuth: false,
})

const route = useRoute()
const projectId = ref<string>()
const project = ref<ProjectResponse>()

const loginCardVisible = ref(false)
const toast = useToast()
const uiBlocker = useUiBlocker()

async function joinSurvey() {
  if (!useAuth().isValid) {
    loginCardVisible.value = true
    return
  }

  uiBlocker.show("Joining...")
  try {
    await ProjectService.join(projectId.value!)

    uiBlocker.show("Saving project config...")
    const projectRes = await ProjectService.getById(projectId.value!)
    const project = projectRes.data
    const projectStore = useProjectStore()

    const syncAt = Date.now()
    await projectStore.save({
      syncAt,
      createdAt: syncAt,
      participantQuota: project.participantQuota,
      fields: project.fields,
      name: project.title,
      isCollaboration: true,
      createdBy: project.createdBy,
      participantNum: project.participantNum,
      versionId: project.versionId,
    }, project.id)

    uiBlocker.show("Saving project layers")

    const layerRes = await ProjectService.getLayers(projectId.value!)
    const layers = layerRes.data
    await useDb().projectLayer.bulkAdd(layers)

    toast.add({
      severity: "success",
      summary: "Successfully join project",
      life: 3000,
    })

    navigateTo("/")
  }
  catch (e) {
    toast.add({
      severity: "error",
      summary: "Failed to join project",
      life: 3000,
      group: "bc",
    })
    Sentry.captureException(e)
  }
  finally {
    uiBlocker.hide()
  }
}

onMounted(async () => {
  const projectParamId = get(route.params as Record<string, string>, "id")

  if (projectParamId == null || projectParamId === "undefined") {
    const summary = `Project ${projectParamId} not found`
    toast.add({
      severity: "error",
      summary,
      closable: true,
      life: 3500,
      group: "bc",
    })
    await navigateTo(`/404?errorMessage=${summary}`)
    return
  }

  const existing = await useProjectStore().getById(projectParamId)

  if (existing != null && existing.id != null) {
    toast.add({
      severity: "info",
      summary: "Already join, moving to survey page",
      life: 3500,
      group: "bc",
    })
    await navigateTo(`/projects/${projectParamId}/survey`)
    return
  }

  projectId.value = projectParamId
  try {
    const res = await ProjectService.getByIdPublic(projectId.value)
    project.value = res.data
  }
  catch (e) {
    const error = tryGetFetchError(e)
    if (error != null) {
      if (error.code === 404) {
        await navigateTo("/404")
      }
    }
  }
})
</script>

<template>
  <div class="mt-8 box-border space-y-6 px-6">
    <Dialog v-model:visible="loginCardVisible" modal header="Login to continue" :style="{ width: '25rem' }">
      <LoginForm
        @success="() => {
          loginCardVisible = false
          joinSurvey()
        }"
      />
    </Dialog>

    <div>
      <IftaLabel fluid>
        <InputText :value="project?.title" fluid />
        <label>Project</label>
      </IftaLabel>
    </div>

    <div>
      <Button fluid @click="joinSurvey">
        Join Survey
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
