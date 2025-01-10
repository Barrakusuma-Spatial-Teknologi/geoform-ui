<script setup lang="ts">
import type { LayerStylePolygon } from "~/composables/project/project-layer"

const emits = defineEmits<{
  changeStyle: []
}>()

const style = defineModel<LayerStylePolygon>("style", {
  required: true,
})

const layerName = ref<string>()
const layerStyle = ref<Omit<LayerStylePolygon, "type">>()
// const { pause, resume } = watchPausable(layerStyle, () => {
//   layerStyle.value = {
//     fillColor: addHashColor(toRaw(style.value.fillColor))!,
//     lineColor: addHashColor(toRaw(style.value.lineColor))!,
//     lineWidth: toRaw(style.value.lineWidth),
//   }
//   emits("changeStyle")
// })

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

onMounted(() => {
  layerStyle.value = {
    fillColor: removeHashColor(toRaw(style.value.fillColor))!,
    lineColor: removeHashColor(toRaw(style.value.lineColor))!,
    lineWidth: toRaw(style.value.lineWidth),
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
  <IftaLabel fluid>
    <InputNumber v-if="layerStyle != null" v-model="layerStyle.lineWidth" fluid disabled />
    <label for="layerName">Line width</label>
  </IftaLabel>
</template>

<style scoped>

</style>
