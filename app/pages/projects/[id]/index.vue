<script setup lang="ts">
import type { FieldConfigWrapper } from "~/components/ProjectConfig/formConfig"
import type { SpatialDataLayers } from "~/components/ProjectConfig/spatialDataConfig"
import { omit } from "es-toolkit"
import { get } from "radash"
import { useAuth } from "~/composables/auth"
import { useLayoutTitle } from "~/composables/layout"
import { type FieldConfig, FieldType } from "~/composables/project/model/project"
import { useProjectStore } from "~/composables/project/project"
import { useProjectLayer } from "~/composables/project/project-layer"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectService } from "~/service/api/project"
import { deepToRaw } from "~/utils/deepToRaw"

definePageMeta({
  backTo: "/",
})

const formMode = ref<"form" | "spatialData">("form")
const route = useRoute()
const projectId = ref<string>(get(route.params, "id"))
const {
  save,
  update,
  getById,
} = useProjectStore()

const config = reactive({
  title: "",
  key: "",
  maxDistanceInMeter: undefined as number | undefined,
})
const formDirty = ref(false)
watch(config, () => {
  formDirty.value = true
})

const toast = useToast()
const fields = ref<FieldConfigWrapper[]>([])
const layers = ref<SpatialDataLayers[]>([])
const { history: layerHistory } = useRefHistory(layers)
const auth = useAuth()
const isOnline = useOnline()
const blocker = useUiBlocker()

async function syncProject(selected: string) {
  blocker.show("Syncing project configuration...")
  try {
    await ProjectService.update(selected)
    toast.add({
      severity: "success",
      summary: "Project synced successfully.",
      life: 3000,
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      summary: "Failed to sync project",
      severity: "error",
      closable: true,
    })
    throw e
  }
  finally {
    blocker.hide()
  }
}

async function saveProject() {
  const parsedFields = fields.value.map((field) => ({
    ...omit(field, ["dirty"]),
    fieldConfig: toRaw(field.fieldConfig),
    ...(field.type === FieldType.NESTED
      ? { fields: toRaw(field.fields).map((f) => ({
          ...f,
          fieldConfig: toRaw(f.fieldConfig),
        })) }
      : {}),
  } as FieldConfig))

  if (projectId.value == null || projectId.value === "new") {
    projectId.value = await save({
      name: config.title,
      fields: toRaw(parsedFields),
      createdAt: Date.now(),
      createdBy: auth.state.username,
      maxDistanceInMeter: config.maxDistanceInMeter,
    })

    const layerOrder = 0
    for (const layer of layers.value) {
      await useProjectLayer(projectId.value!).add({
        projectId: toRaw(projectId.value!),
        layerStyle: toRaw(layer.layerStyle),
        layerName: toRaw(layer.layerName),
        layerOrder,
        layerData: toRaw(layer.layerData),
      })
    }
  }
  else {
    const selected = await getById(projectId.value)
    if (selected == null) {
      return
    }

    const fieldDirty = fields.value.some((v) => v.dirty)

    const layerDirty = layerHistory.value.length > 1

    if (!fieldDirty && !formDirty.value && !layerDirty) {
      toast.add({
        severity: "info",
        summary: "No changes made",
        life: 3000,
      })
      return
    }

    await update({
      name: config.title,
      fields: toRaw(parsedFields),
      id: projectId.value!,
      updatedAt: Date.now(),
      createdAt: selected!.createdAt,
      maxDistanceInMeter: config.maxDistanceInMeter,
    })

    let layerOrder = 0
    await useProjectLayer(projectId.value!).remove()

    for (const layer of layers.value) {
      const layerData = layer.layerData && deepToRaw(layer.layerData)

      await useProjectLayer(projectId.value).update({
        id: toRaw(layer.id),
        projectId: toRaw(projectId.value),
        layerStyle: toRaw(layer.layerStyle),
        layerName: toRaw(layer.layerName),
        layerOrder,
        layerData,
        createdAt: get(layer, "createdAt", Date.now()),
      })
      layerOrder += 1
    }

    if (selected.syncAt != null && isOnline.value) {
      await syncProject(projectId.value)
    }
  }

  toast.add({
    severity: "success",
    summary: `Project ${config.title} saved!`,
    life: 3000,
  })
  formDirty.value = false

  await navigateTo("/")
}

const layoutTitle = useLayoutTitle()
onBeforeUnmount(() => {
  layoutTitle.value = undefined
})

onMounted(async () => {
  layoutTitle.value = "New project"

  if (projectId.value == null) {
    return
  }

  const selected = await getById(projectId.value)
  if (selected == null) {
    return
  }

  layoutTitle.value = "Modify project"

  config.title = selected.name
  config.key = selected.id
  config.maxDistanceInMeter = selected.maxDistanceInMeter

  fields.value = selected.fields.map((field) => ({ ...field, fieldConfig: field?.fieldConfig ?? {}, dirty: false, strictChange: selected.syncAt != null } as FieldConfigWrapper))

  layers.value = (await useProjectLayer(projectId.value).getAll()).map((layer) => ({
    ...layer,
    layerData: layer.layerData ?? {},
    layerStyle: layer.layerStyle ?? {},
    visible: true,
  }))
  formDirty.value = false
})
</script>

<template>
  <div class="flex size-full flex-col pt-4">
    <div class="w-full shrink-0 grow-0 px-4 pb-6">
      <div class="grid w-full grid-cols-2 gap-x-4">
        <Button fluid :severity="formMode === 'form' ? 'primary' : 'secondary'" @click="formMode = 'form'">
          Form
        </Button>
        <Button
          fluid :severity="formMode === 'spatialData' ? 'primary' : 'secondary'"
          @click="formMode = 'spatialData'"
        >
          Spatial Data
        </Button>
      </div>
    </div>
    <div class="size-full grow">
      <TransitionFade mode="out-in">
        <ProjectConfigForm v-if="formMode === 'form'" v-model:config="config" v-model:fields="fields" />
        <ProjectConfigSpatialData v-else v-model:layers="layers" />
      </TransitionFade>
    </div>

    <div class="box-border flex w-full grow-0 items-center justify-center gap-2 p-4">
      <Button fluid @click="saveProject">
        Save
      </Button>
    </div>
  </div>
</template>
