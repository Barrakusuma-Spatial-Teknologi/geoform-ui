<script setup lang="ts">
import type { Map as MglMap } from "maplibre-gl"
import { get, objectify } from "radash"
import { match, P } from "ts-pattern"
import { type FieldConfig, FieldType } from "~/composables/project"

const props = defineProps<{
  fields: FieldConfig[]
  coordinate: {
    lng: number
    lat: number
  }
}>()

const emits = defineEmits<{
  close: []
  save: [feature: Record<string, any>]
}>()

let map!: MglMap

const fieldValues = ref<(FieldConfig & {
  value: any
})[]>([])

function resetFields() {
  fieldValues.value = props.fields.map((field) => ({
    ...field,
    value: undefined,
  }))
}

watch(props.fields, () => {
  resetFields()
})

function save() {
  const feature = objectify(fieldValues.value, (o) => o.name, (o) => {
    return match(o.value)
      .with(P.array(), (values) => values.map((v) => get(v, "value", "")).join(";"))
      .otherwise((obj) => obj)
  })
  emits("save", feature)
}

// const coordinateWatcher = watchPausable(() => props.coordinate, () => {
//   if (map == null) {
//     return
//   }
//   const source = map.getSource("userPosition") as GeoJSONSource
//   if (source == null) {
//     return
//   }
//
//   source.setData({
//     type: "FeatureCollection",
//     features: [{
//       type: "Feature",
//       properties: {},
//       geometry: {
//         type: "Point",
//         coordinates: [props.coordinate.lng, props.coordinate.lat],
//       },
//     }],
//   })
// })

onActivated(() => {
  resetFields()
})
onMounted(() => {
  resetFields()
  // map = new MglMap({
  //   container: "map",
  //   refreshExpiredTiles: false,
  //   attributionControl: false,
  //   style: {
  //     version: 8,
  //     glyphs: "https://font-pbf.sahito.no/{fontstack}/{range}.pbf",
  //     sources: {
  //       basemapOsm: {
  //         type: "raster",
  //         tiles: [
  //           "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  //         ],
  //         maxzoom: 18,
  //       },
  //       userPosition: {
  //         type: "geojson",
  //         data: {
  //           type: "FeatureCollection",
  //           features: [],
  //         },
  //       },
  //     },
  //     layers: [
  //       {
  //         type: "raster",
  //         id: "basemap",
  //         source: "basemapOsm",
  //       },
  //       {
  //         id: "userPosition",
  //         type: "circle",
  //         source: "userPosition",
  //         paint: {
  //           "circle-color": "#da9210",
  //           "circle-radius": 10,
  //         },
  //       },
  //     ],
  //   },
  //   bounds: [
  //     106.639,
  //     -6.38209,
  //     107.008,
  //     -6.07012,
  //   ],
  //   maxZoom: 20,
  //   maxPitch: 0,
  //   dragRotate: false,
  //   doubleClickZoom: false,
  //   maplibreLogo: false,
  //   validateStyle: false,
  //   preserveDrawingBuffer: false,
  // })
  //
  // map.on("load", () => {
  // })
})

onBeforeUnmount(() => {
  resetFields()
})
onDeactivated(() => {
  resetFields()
})
// onBefore
</script>

<template>
  <div class="box-border flex size-full flex-col rounded-lg bg-surface-800 p-4">
    <div class="mb-5 grow-0 font-bold">
      Fill form
    </div>

    <div class="w-full grow basis-0 overflow-y-auto">
      <ul class="flex w-full flex-col space-y-4">
        <li>
          <div class="text-sm">
            Location at
          </div>

          <div>
            {{ props.coordinate.lng }}
          </div>
          <div>
            {{ props.coordinate.lat }}
          </div>
        </li>

        <li v-for="field in fieldValues" :key="field.key" class="w-full">
          <template v-if="field.type === FieldType.TEXT">
            <IftaLabel fluid class="">
              <InputText :id="field.key" v-model.lazy="field.value" fluid />
              <label :for="field.key">{{ field.name }}</label>
            </IftaLabel>
          </template>
          <template v-else-if="field.type === FieldType.NUMBER">
            <IftaLabel fluid class="">
              <InputNumber :id="field.key" v-model.lazy="field.value" fluid />
              <label :for="field.key">{{ field.name }}</label>
            </IftaLabel>
          </template>

          <template v-else-if="field.type === FieldType.DATE">
            <IftaLabel fluid class="">
              <DatePicker :id="field.key" v-model="field.value" fluid />
              <label :for="field.key">{{ field.name }}</label>
            </IftaLabel>
          </template>

          <template v-else-if="field.type === FieldType.IMAGE">
            <div>
              <label :for="field.key" class="pb-2 pl-2 text-xs">{{ field.name }}</label>
              <FieldInputImage v-model:image="field.value" />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.CHECKBOX">
            <div>
              <label :for="field.key" class="pb-2 pl-2 text-xs">{{ field.name }}</label>
              <Listbox
                v-model="field.value" :multiple="field.optionConfig?.multiple ?? true"
                :options="field.optionConfig?.options ?? []" option-label="value" class="w-full"
                fluid
              />
            </div>
          </template>

          <template v-else-if="field.type === FieldType.BOOLEAN">
            <div class="flex items-center gap-2">
              <Checkbox :id="field.key" v-model="field.value" binary />
              <label :for="field.key"> {{ field.name }} </label>
            </div>
          </template>
        </li>
      </ul>
    </div>

    <div class="flex w-full justify-between gap-4">
      <Button
        class="grow-0" variant="text" severity="secondary" @click="() => {
          emits('close')
        }"
      >
        Cancel
      </Button>
      <Button class="grow font-bold" @click="save">
        Save
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
