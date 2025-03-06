<script setup lang="ts">
import type { SpatialDataLayers } from "../spatialDataConfig"
import type { LayerDataGeoJSON, LayerStylePolygon } from "~/composables/project/model/project-layer"
import { centroid } from "@turf/centroid"

const emits = defineEmits<{
  changeStyle: []
  labelToMap: [string, string, LayerDataGeoJSON, string]
}>()

const style = defineModel<LayerStylePolygon>("style", {
  required: true,
})

const data = defineModel<SpatialDataLayers>("data", {
  required: true,
})
// eslint-disable-next-line unused-imports/no-unused-vars
const layerName = ref<string>()
const layerStyle = ref<Omit<LayerStylePolygon, "type">>()
const layerData = ref<LayerDataGeoJSON>()
const selectedColumnLabel = ref<string>()
// const { pause, resume } = watchPausable(layerStyle, () => {
//   layerStyle.value = {
//     fillColor: addHashColor(toRaw(style.value.fillColor))!,
//     lineColor: addHashColor(toRaw(style.value.lineColor))!,
//     lineWidth: toRaw(style.value.lineWidth),
//   }
//   emits("changeStyle")
// })

// eslint-disable-next-line unused-imports/no-unused-vars
function addHashColor(color?: string): string {
  if (color == null) {
    return ""
  }

  return `#${color}`
}

function removeHashColor(color?: string): string {
  if (color == null) {
    return ""
  }

  return color.replaceAll("#", "")
}

function changeLineColor(v: any) {
  layerStyle.value!.lineColor = v
  // style.value.lineColor = `#${v}`
  style.value = {
    ...style.value,
    lineColor: `#${v}`,
  }
  emits("changeStyle")
}

function changeFillColor(v: any) {
  layerStyle.value!.fillColor = v
  style.value = {
    ...style.value,
    fillColor: `#${v}`,
  }
  // style.value.fillColor = `#${v}`
  emits("changeStyle")
}

function createPolygonCentroid() {
  if (!layerData.value) {
    return
  }

  const point = layerData.value.data.features.map((feature) =>
    centroid(feature, { properties: toRaw(feature.properties) }),
  )

  if (!point) {
    return
  }

  layerData.value.data.features = point
}

function addColumnLabelToStyle(column: string) {
  style.value = {
    ...style.value,
    labelField: column,
  }
}

watch(selectedColumnLabel, () => {
  if (!selectedColumnLabel.value) {
    return
  }

  if (!layerData.value) {
    return
  }

  addColumnLabelToStyle(toRaw(selectedColumnLabel.value))
  const { id, layerName } = data.value
  const labelLayerName = `${layerName}__symbol`
  const lId = `${id}__symbol`
  emits("labelToMap", labelLayerName, lId, layerData.value, toRaw(selectedColumnLabel.value))
})

const columnLabelOptions = computed<{
  value: string
  label: string
}[]>(() => {
  if (!layerData.value?.data?.features?.[0]?.properties) {
    return []
  }

  return Object.keys(layerData.value.data.features[0].properties).map((key) => ({
    value: key,
    label: key,
  }))
})

onMounted(() => {
  layerStyle.value = {
    fillColor: removeHashColor(toRaw(style.value.fillColor))!,
    lineColor: removeHashColor(toRaw(style.value.lineColor))!,
    lineWidth: toRaw(style.value.lineWidth),
  }

  if (data.value.layerData?.type === "GEOJSON") {
    layerData.value = {
      type: toRaw(data.value.layerData.type),
      data: toRaw(data.value.layerData.data),
    }
  }

  createPolygonCentroid()

  if (style.value.labelField) {
    selectedColumnLabel.value = style.value.labelField
  }
})
</script>

<template>
  <IftaLabel fluid>
    <label for="layerName">Fill color</label>
    <div class="rounded border border-surface-600 px-2 py-1" style="background-color: var(--p-inputtext-background)">
      <div v-if="layerStyle != null" class="mt-6 flex space-x-4">
        <ColorPicker

          :default-color="layerStyle?.fillColor" input-id="cp-hex" format="hex" @value-change="changeFillColor"
        />
        <div>#{{ layerStyle.fillColor }}</div>
      </div>
    </div>
  </IftaLabel>
  <IftaLabel fluid>
    <label for="layerName">Line color</label>
    <div class="rounded border border-surface-600 px-2 py-1" style="background-color: var(--p-inputtext-background)">
      <div v-if="layerStyle != null" class="mt-6 flex space-x-4">
        <ColorPicker
          :default-color="layerStyle?.lineColor" input-id="cp-hex" format="hex" @value-change="changeLineColor"
        />
        <div>#{{ layerStyle.lineColor }}</div>
      </div>
    </div>
  </IftaLabel>
  <template v-if="layerData?.type === 'GEOJSON'">
    <IftaLabel fluid>
      <Select
        id="columnLabel" v-model="selectedColumnLabel" :options="columnLabelOptions" option-label="label" option-value="value"
        fluid
      />
      <label for="columnLabel">Column label</label>
    </IftaLabel>
  </template>
  <IftaLabel fluid>
    <InputNumber v-if="layerStyle != null" v-model="layerStyle.lineWidth" fluid disabled />
    <label for="layerName">Line width</label>
  </IftaLabel>
</template>

<style scoped>

</style>
