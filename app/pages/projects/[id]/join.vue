<script setup lang="ts">
import type { FetchError } from "ofetch"
import { get } from "es-toolkit/compat"
import { tryit } from "radash"
import { BackendError } from "~~/constants/error-message"
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
    const [err, _] = await tryit(ProjectService.join)(projectId.value!)
    if (err != null) {
      const errHttp = tryGetFetchError(err)
      if (errHttp.message === BackendError.ParticipantAlreadyExists) {
        toast.add({
          severity: "info",
          summary: "Already join, resaving project...",
          life: 3500,
          group: "bc",
        })
      }
      else {
        throw err
      }
    }

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
    captureToCloud(e)
  }
  finally {
    uiBlocker.hide()
  }
}

const blocker = useUiBlocker()
onMounted(async () => {
  const projectParamId = get(route.params as Record<string, string>, "id")
  blocker.show("Checking project status...")

  if (projectParamId == null || projectParamId === "undefined") {
    const summary = `Project ${projectParamId} not found`
    toast.add({
      severity: "error",
      summary,
      closable: true,
      life: 3500,
      group: "bc",
    })
    blocker.hide()
    await navigateTo(`/404?errorMessage=${summary}`)
    return
  }

  const projectStore = useProjectStore()
  const [err, existing] = await tryit(projectStore.getById)(projectParamId)
  if (err != null) {
    toast.add({
      severity: "error",
      summary: "Database not initialized, please refresh page",
      life: 3500,
      group: "bc",
    })
    captureToCloud(err)
    return
  }
  // await useProjectStore().getById(projectParamId)

  if (existing != null && existing.id != null) {
    blocker.hide()
    if (useAuth().isValid) {
      toast.add({
        severity: "info",
        summary: "Already in local, moving to survey page",
        life: 3500,
        group: "bc",
      })
      await navigateTo(`/projects/${projectParamId}/survey`)
    }
    else {
      toast.add({
        severity: "info",
        summary: "Session expired, please login again",
        life: 3500,
        group: "bc",
      })
      await navigateTo("/login")
    }

    return
  }

  projectId.value = projectParamId
  try {
    const res = await ProjectService.getByIdPublic(projectId.value)
    project.value = res.data
  }
  catch (e) {
    const error = tryGetFetchError(e as FetchError<any>)
    if (error != null) {
      if (error.code === 404) {
        await navigateTo("/404")
      }
    }
  }
  finally {
    blocker.hide()
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
      <Button fluid :disabled="projectId == null" @click="joinSurvey">
        Join Survey
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
