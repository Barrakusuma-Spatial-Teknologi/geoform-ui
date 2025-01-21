<script setup lang="ts">
import type { FieldConfigWrapper } from "~/components/ProjectConfig/formConfig"
import type { SpatialDataLayers } from "~/components/ProjectConfig/spatialDataConfig"
import type { FieldConfig } from "~/composables/project/model/project"
import { omit } from "es-toolkit"
import { get } from "radash"
import { useAuth } from "~/composables/auth"
import { useLayoutTitle } from "~/composables/layout"
import { useProjectStore } from "~/composables/project/project"
import { useProjectLayer } from "~/composables/project/project-layer"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectService } from "~/service/api/project"

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
})
const formDirty = ref(false)
watch(config, () => {
  formDirty.value = true
})

const toast = useToast()
const fields = ref<FieldConfigWrapper[]>([])
const layers = ref<SpatialDataLayers[]>([])
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
  }
  finally {
    blocker.hide()
  }
}

async function saveProject() {
  const parsedFields = fields.value.map((field) => ({
    ...omit(field, ["dirty"]),
    fieldConfig: toRaw(field.fieldConfig),
  } as FieldConfig))

  if (projectId.value == null || projectId.value === "new") {
    projectId.value = await save({
      name: config.title,
      fields: toRaw(parsedFields),
      createdAt: Date.now(),
      createdBy: auth.state.username,
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

    if (!fieldDirty && !formDirty.value) {
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
    })

    const layerOrder = 0
    for (const layer of layers.value) {
      await useProjectLayer(projectId.value).update({
        id: layer.id,
        projectId: toRaw(projectId.value),
        layerStyle: toRaw(layer.layerStyle),
        layerName: toRaw(layer.layerName),
        layerOrder,
        layerData: toRaw(layer.layerData),
        createdAt: get(layer, "createdAt", Date.now()),
      })
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

    <!--    <div class="box-border flex size-full grow basis-0 flex-col overflow-y-scroll px-4"> -->
    <!--      <form class="mb-6 box-border flex size-full grow flex-col"> -->
    <!--        <IftaLabel fluid class="mb-6 "> -->
    <!--          <InputText id="title" v-model="config.title" fluid /> -->
    <!--          <label for="title">Title</label> -->
    <!--        </IftaLabel> -->

    <!--        <div class="mb-2"> -->
    <!--          Fields -->
    <!--        </div> -->
    <!--        <div class="w-full grow basis-0 overflow-y-scroll "> -->
    <!--          <template v-for="(field, fieldIndex) in fields" :key="field.key"> -->
    <!--            <div class="mb-4 box-border w-full space-y-2 rounded-lg bg-surface-800 px-4 py-2"> -->
    <!--              <IftaLabel fluid class=""> -->
    <!--                <InputText :id="field.key" v-model.lazy="field.name" size="small" fluid /> -->
    <!--                <label :for="field.key">Label</label> -->
    <!--              </IftaLabel> -->

    <!--              <IftaLabel fluid> -->
    <!--                <Select -->
    <!--                  v-model="field.type" input-id="dd-city" :options="fieldOptions" class="w-full" variant="filled" -->
    <!--                  @update:model-value="(v) => { -->
    <!--                    if (v === FieldType.CHECKBOX) { -->
    <!--                      field.fieldConfig = { -->
    <!--                        options: [{ -->
    <!--                          key: nanoid(), -->
    <!--                          value: '', -->
    <!--                        }], -->
    <!--                        multiple: true, -->
    <!--                      } -->
    <!--                    } -->
    <!--                    else { -->
    <!--                      field.fieldConfig = undefined -->
    <!--                    } -->
    <!--                  }" -->
    <!--                /> -->
    <!--                <label for="dd-city">Type</label> -->
    <!--              </IftaLabel> -->

    <!--              <template v-if="field.type === FieldType.CHECKBOX && field.fieldConfig != null"> -->
    <!--                <div class="flex items-center gap-2 py-2"> -->
    <!--                  <Checkbox v-model="field.fieldConfig.multiple" binary /> -->
    <!--                  <label> Multiple </label> -->
    <!--                </div> -->

    <!--                <template v-for="(item, optionIndex) in field.fieldConfig.options" :key="item.key"> -->
    <!--                  <InputGroup> -->
    <!--                    <InputText :id="item.key" v-model="item.value" size="small" fluid /> -->
    <!--                    <InputGroupAddon> -->
    <!--                      <Button -->
    <!--                        size="small" variant="text" severity="secondary" @click="() => { -->
    <!--                          field.fieldConfig?.options.splice(optionIndex, 1) -->
    <!--                        }" -->
    <!--                      > -->
    <!--                        <i class="i-[solar&#45;&#45;trash-bin-trash-bold] text-lg" /> -->
    <!--                      </Button> -->
    <!--                    </InputGroupAddon> -->
    <!--                  </InputGroup> -->
    <!--                </template> -->

    <!--                <div -->
    <!--                  class="flex w-full justify-center" @click="() => { -->
    <!--                    field.fieldConfig?.options.push({ -->
    <!--                      key: nanoid(), -->
    <!--                      value: '', -->
    <!--                    }) -->
    <!--                  }" -->
    <!--                > -->
    <!--                  <Button rounded severity="secondary"> -->
    <!--                    Add new option -->
    <!--                  </Button> -->
    <!--                </div> -->
    <!--              </template> -->

    <!--              <div class="flex w-full justify-between border-t border-surface-700"> -->
    <!--                <div class="flex items-center gap-2"> -->
    <!--                  <Checkbox v-model="field.required" binary /> -->
    <!--                  <label for="ingredient1"> Required </label> -->
    <!--                </div> -->

    <!--                <Button -->
    <!--                  size="small" variant="text" severity="secondary" @click="() => { -->
    <!--                    fields.splice(fieldIndex, 1) -->
    <!--                  }" -->
    <!--                > -->
    <!--                  <i class="i-[solar&#45;&#45;trash-bin-trash-bold] text-lg" /> -->
    <!--                </Button> -->
    <!--              </div> -->
    <!--            </div> -->
    <!--          </template> -->
    <!--        </div> -->
    <!--      </form> -->

    <!--      <div class="flex w-full grow-0 justify-center" @click="addNewField"> -->
    <!--        <Button rounded severity="secondary"> -->
    <!--          Add new field -->
    <!--        </Button> -->
    <!--      </div> -->
    <!--    </div> -->

    <div class="box-border flex w-full grow-0 items-center justify-center gap-2 p-4">
      <!--      <Button severity="secondary" @click="navigateTo('/')"> -->
      <!--        Back -->
      <!--      </Button> -->

      <Button fluid @click="saveProject">
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
