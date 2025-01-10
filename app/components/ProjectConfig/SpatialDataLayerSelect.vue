<script setup lang="ts">
import type { FeatureCollection } from "geojson"
import type { TileJSON } from "maplibre-gl/src/util/util"
import type { FileUploadSelectEvent } from "primevue"
import { match } from "ts-pattern"
import {
  type LayerData,
  type LayerDataGeoJSON,
  LayerDataType,
  type LayerDataXYZRaster,
} from "~/composables/project/model/project-layer"
import { isValidMaplibreTileUrl } from "~/utils/urlValidation"

const emits = defineEmits<{
  addData: [name: string, layer: LayerData, bounds?: TileJSON["bounds"]]
  cancel: []
}>()

const toast = useToast()

const selectedType = ref<LayerDataType>()
const data = ref<LayerData>()
const layerName = ref<string>(generateId())

watch(selectedType, () => {
  if (selectedType.value == null) {
    data.value = undefined
    return
  }

  match(selectedType.value)
    .with(LayerDataType.GEOJSON, (t) => {
      data.value = {
        type: t,
        data: {
          type: "FeatureCollection",
          features: [],
        } as FeatureCollection,
      }
    })
    .with(LayerDataType.XYZVECTOR, (t) => {
      data.value = {
        type: t,
        tileUrl: undefined,
      }
    })
    .with(LayerDataType.XYZRASTER, (t) => {
      data.value = {
        type: t,
        tileUrl: undefined,
      }
    })
    .run()
})

const layerTypeOptions: {
  value: LayerDataType
  label: string
}[] = [
  {
    value: LayerDataType.GEOJSON,
    label: "GeoJSON",
  },
  // {
  //   value: LayerDataType.XYZVECTOR,
  //   label: "XYZ Vector",
  // },
  {
    value: LayerDataType.XYZRASTER,
    label: "XYZ Raster",
  },
]

function onFileSelect(event: FileUploadSelectEvent) {
  const file = event.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    const result = e.target?.result

    if (!result) {
      toast.add({
        severity: "error",
        summary: "Empty features",
      })
      return
    }

    try {
      const content = typeof result === "string"
        ? result
        : new TextDecoder().decode(result);
      (data.value! as LayerDataGeoJSON).data = JSON.parse(content) as FeatureCollection
    }
    catch {
      toast.add({
        severity: "error",
        summary: "Invalid GeoJSON file",
      })
    }
  }

  reader.readAsText(file)
}

async function tryObtainTileUrl() {
  const layerData = data.value as LayerDataXYZRaster
  if (isValidMaplibreTileUrl(layerData.tileUrl)) {
    return
  }

  const tilejson = await $fetch<TileJSON>(layerData.tileUrl)
  layerData.tileUrl = tilejson.tiles[0]
  return tilejson?.bounds
}

async function addLayer() {
  if (data.value == null) {
    return
  }

  if (data.value.type === LayerDataType.XYZRASTER) {
    try {
      const bounds = await tryObtainTileUrl()
      emits("addData", layerName.value, data.value, bounds)
      return
    }
    catch (e) {
      console.error(e)
      toast.add({ severity: "error", summary: "Failed to obtain TileJSON metadata", life: 3000 })
      return
    }
  }

  emits("addData", layerName.value, data.value)
}
</script>

<template>
  <div class="mb-8 min-h-[200px]">
    <IftaLabel fluid class="mb-4">
      <InputText
        id="layerType" v-model="layerName"
        fluid
      />
      <label for="field-type">Layer Name</label>
    </IftaLabel>

    <IftaLabel fluid class="mb-8">
      <Select
        id="layerType" v-model="selectedType" :options="layerTypeOptions" option-label="label" option-value="value"
        fluid
      />
      <label for="field-type">Layer Type</label>
    </IftaLabel>

    <template v-if="selectedType === LayerDataType.GEOJSON">
      <FileUpload
        mode="basic" custom-upload severity="secondary" class="p-button-outlined" accept=".geojson"
        :max-file-size="1024 * 1024 * 30" @select="onFileSelect"
      />
    </template>
    <template v-else-if="selectedType === LayerDataType.XYZRASTER">
      <IftaLabel fluid class="mb-4">
        <InputText
          id="layerUrl"
          v-model="(data as LayerDataType.XYZRASTER)!.tileUrl"
          fluid
          placeholder="URL TileJSON or XYZ"
        />
        <label for="layerUrl">Layer URL</label>
      </IftaLabel>
    </template>
  </div>

  <div class="flex w-full   gap-x-8">
    <div class="w-[50px] grow-0">
      <Button severity="secondary" @click="emits('close')">
        Cancel
      </Button>
    </div>

    <div class="grow">
      <Button fluid @click="addLayer">
        Add Layer
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
