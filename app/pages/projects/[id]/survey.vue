<script setup lang="ts">
import type { GeoJSONSource } from "maplibre-gl"
import { Map as MglMap } from "maplibre-gl"
import { nanoid } from "nanoid"
import { type FieldConfig, type Project, useProjectStore } from "~/composables/project"
import { type ProjectDataFeature, useProjectData } from "~/composables/project/project-data"

definePageMeta({
  layout: "empty",
})

let map!: MglMap
const route = useRoute()
const projectIndex = Number.parseInt(route.params!.id)

const { projects } = useProjectStore()
const selectedProject = ref<Project>()
const selectedProjectFieldValue = ref<(FieldConfig & {
  value: any
})[]>([])
let projectDb!: ReturnType<typeof useProjectData>
const projectDataFeatures = ref<ProjectDataFeature[]>([])

async function addProjectDataFeature(feature: ProjectDataFeature) {
  await projectDb.add(feature, nanoid())
  projectDataFeatures.value.push(feature)

  const source = map.getSource("surveyData") as GeoJSONSource
  if (source == null) {
    return
  }

  source.setData({
    type: "FeatureCollection",
    features: projectDataFeatures.value.map((feature) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [feature.lng, feature.lat],
      },
      properties: feature,
      // properties: feature,
    })),
  })
}

const formVisible = ref(false)

const {
  coords,
  resume,
  pause,
} = useGeolocation({
  immediate: true,
  enableHighAccuracy: true,
})

watch(coords, () => {
  if (map == null) {
    return
  }
  const source = map.getSource("userPosition") as GeoJSONSource
  if (source == null) {
    return
  }

  source.setData({
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [coords.value.longitude, coords.value.latitude],
      },
    }],
  })
})

function backToHome() {
  navigateTo("/", {
    replace: true,
  })
}

const showDataVisible = ref(false)

onBeforeUnmount(() => {
  if (map == null) {
    return
  }

  map.remove()
})
onMounted(async () => {
  await requestPermissions()

  map = new MglMap({
    container: "map",
    refreshExpiredTiles: false,
    attributionControl: false,
    style: {
      version: 8,
      glyphs: "https://font-pbf.sahito.no/{fontstack}/{range}.pbf",
      sources: {
        basemapOsm: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          maxzoom: 18,
        },
        userPosition: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        },

        surveyData: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        },
      },
      layers: [
        {
          type: "raster",
          id: "basemap",
          source: "basemapOsm",
        },
        {
          id: "userPosition",
          type: "circle",
          source: "userPosition",
          paint: {
            "circle-color": "#da9210",
            "circle-radius": 10,
          },
        },
        {
          id: "surveyData",
          type: "circle",
          source: "surveyData",
          paint: {
            "circle-color": "#d75c5c",
            "circle-radius": 10,
          },
        },
      ],
    },
    bounds: [
      106.639,
      -6.38209,
      107.008,
      -6.07012,
    ],
    maxZoom: 20,
    maxPitch: 0,
    dragRotate: false,
    doubleClickZoom: false,
    maplibreLogo: false,
    validateStyle: false,
    preserveDrawingBuffer: false,
  })

  map.on("load", () => {
    const selected = projects.value[projectIndex - 1]
    if (!selected) {
      return
    }

    selectedProject.value = selected
    // formVisible.value = true
    selectedProjectFieldValue.value = selected.fields.map((field) => ({
      ...field,
      value: undefined,
    }))
    projectDb = useProjectData(selectedProject.value.key)
  })
})
</script>

<template>
  <div class="relative flex size-full flex-col">
    <Drawer
      v-model:visible="formVisible" pt:root:class="!border-0 !bg-transparent" class="!h-[90vh]"
      pt:mask:class="backdrop-blur-sm" position="bottom"
    >
      <template #container="{ closeCallback }">
        <div v-if="selectedProject != null" class="size-full">
          <FieldInputForm
            :fields="selectedProject?.fields ?? []"
            :coordinate="{
              lng: coords.longitude,
              lat: coords.latitude,
            }"
            @close="closeCallback"
            @save="async (feature) => {
              await addProjectDataFeature({
                ...feature,
                lat: coords.latitude,
                lng: coords.longitude,
              })
              closeCallback()
            }"
          />
        </div>
      </template>
    </Drawer>

    <Drawer v-model:visible="showDataVisible" position="bottom" class="!h-[90vh]">
      <template #header>
        Survey Data
      </template>
      <SurveyDataTable v-if="selectedProject != null" :project-id="selectedProject.key" />
    </Drawer>

    <div class="header box-border flex w-full grow-0 items-center justify-between px-6 py-2">
      <CommonThemeButton />

      <div>{{ selectedProject?.name }}</div>

      <Button severity="secondary" size="small" text>
        <i class="i-[solar--settings-bold] text-2xl" />
      </Button>
    </div>

    <main class="flex grow basis-0 flex-col">
      <div class="grow">
        <div id="map" class="map relative size-full" />
      </div>
      <div class="box-border flex grow-0 justify-between space-x-4 px-6 py-4">
        <Button severity="primary" size="small" variant="text" @click="backToHome">
          Home
        </Button>

        <Button severity="primary" size="small" variant="text">
          Layers
        </Button>

        <Button severity="primary" size="small" variant="text" @click="showDataVisible = true">
          Show data
        </Button>

        <Button severity="primary" size="small" @click="formVisible = true">
          Add data
        </Button>
      </div>
    </main>
  </div>
</template>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
