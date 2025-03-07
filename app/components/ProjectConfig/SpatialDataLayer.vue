<script setup lang="ts">
import type { SpatialDataLayers } from "~/components/ProjectConfig/spatialDataConfig"
import { type LayerDataGeoJSON, type LayerStylePolygon, LayerStyleType } from "~/composables/project/model/project-layer"

const emits = defineEmits<{
  changeStyle: []
  addLabelLayerToMap: [
    labelLayerName: string,
    labelLayerId: string,
    labelLayerData: LayerDataGeoJSON,
    labelField: string[],
  ]
}>()

const layer = defineModel<SpatialDataLayers>("layer", {
  required: true,
})

const style = defineModel<SpatialDataLayers["layerStyle"]>("style", {
  required: true,
})
watch(style, () => {
  emits("changeStyle")
})

function styleChanged() {
  emits("changeStyle")
}

function addLabelLayerToMap(
  labelLayerName: string,
  labelLayerId: string,
  labelLayerData: LayerDataGeoJSON,
  labelField: string[],
) {
  emits("addLabelLayerToMap", labelLayerName, labelLayerId, labelLayerData, labelField)
}

const layerType = computed<LayerStyleType | undefined>(() => {
  return layer.value.layerStyle?.type
})

onMounted(() => {})
</script>

<template>
  <div class="w-full space-y-4">
    <IftaLabel fluid>
      <InputText id="layerName" v-model="layer.layerName" fluid />
      <label for="layerName">Layer Name</label>
    </IftaLabel>

    <template v-if="layerType != null && layer.layerStyle != null">
      <template v-if="layerType === LayerStyleType.POLYGON">
        <ProjectConfigSpatialDataStylePolygon
          v-model:data="layer"
          v-model:style="style as LayerStylePolygon"
          @change-style="styleChanged"
          @add-label-layer-to-map="addLabelLayerToMap"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>

</style>
