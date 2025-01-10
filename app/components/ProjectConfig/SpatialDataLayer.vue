<script setup lang="ts">
import type { SpatialDataLayers } from "~/components/ProjectConfig/spatialDataConfig"
import { type LayerStylePolygon, LayerStyleType } from "~/composables/project/model/project-layer"

const emits = defineEmits<{
  changeStyle: []
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
          v-model:style="style as LayerStylePolygon"
          @change-style="styleChanged"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>

</style>
