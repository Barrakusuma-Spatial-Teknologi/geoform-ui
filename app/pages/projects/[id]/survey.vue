<script setup lang="ts">
import type { Point } from "geojson"
import type { GeoJSONSource, LayerSpecification, StyleSpecification } from "maplibre-gl"
import type { FieldConfig } from "~/composables/project/model/project"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import { orderBy } from "es-toolkit"
import { get } from "es-toolkit/compat"
import { Map as MglMap } from "maplibre-gl"
import { match } from "ts-pattern"
import { usePrimaryColor } from "~/composables/color"
import { useLayoutTitle } from "~/composables/layout"
import { onMapLoad } from "~/composables/maplibre-helper/onMapLoad"
import { LayerDataType, type LayerStylePolygon, type ProjectLayer } from "~/composables/project/model/project-layer"
import { useProjectStore } from "~/composables/project/project"
import { useProjectData } from "~/composables/project/project-data"
import { useProjectLayer } from "~/composables/project/project-layer"
import { useUiBlocker } from "~/composables/ui/blocker"

definePageMeta({
  layout: "default",
  backTo: "/",
})

const layoutTitle = useLayoutTitle()

const toast = useToast()
let map!: MglMap
const route = useRoute()
const projectIndex = String(get(route.params, "id"))
const projectDataIdSelected = ref<string>()

const { getById: getProjectById } = useProjectStore()

const selected = await getProjectById(projectIndex)
if (selected == null) {
  toast.add({
    summary: "Project not found",
    severity: "error",
    life: 3000,
  })
  await navigateTo("/")
}

const selectedProject = ref(toRaw(selected))
const selectedProjectFieldValue = ref<(FieldConfig & {
  value: any
})[]>([])

layoutTitle.value = selectedProject.value?.name
selectedProjectFieldValue.value = selected!.fields.map((field) => ({
  ...field,
  value: undefined,
}))
const projectData = useProjectData(selectedProject.value!.id)

// const projectDataFeatures = ref<ProjectDataFeature[]>([])
const projectLayers = ref<(Pick<ProjectLayer, "layerName" | "id" | "layerStyle"> & {
  visible: true
})[]>([])

async function loadProjectDataToMap() {
  if (map == null) {
    return
  }

  const source = map.getSource("surveyData") as GeoJSONSource
  if (source == null) {
    return
  }

  const data = projectData.data.value ?? []
  source.setData({
    type: "FeatureCollection",
    features: data.map((row) => {
      const rowData = row.data as ProjectDataFeature
      return {
        type: "Feature",
        id: row.id,
        geometry: rowData.geom,
        properties: {
          projectId: row.projectId,
          lat: (rowData.geom as Point).coordinates[1],
        },
      }
    }),
  })
}

watch(projectData.data, () => {
  loadProjectDataToMap()
})

const {
  coords,
} = useGeolocation({
  immediate: true,
  enableHighAccuracy: true,
})

const positionAccuracy = computed(() => coords.value.accuracy)

const formVisible = ref(false)
const selectedCoordinate = ref({
  lng: 0,
  lat: 0,
})

function showForm(coord?: {
  lng: number
  lat: number
}) {
  if (coord != null) {
    selectedCoordinate.value = coord
  }
  else {
    selectedCoordinate.value = {
      lng: coords.value.longitude,
      lat: coords.value.latitude,
    }
  }

  formVisible.value = true
}

function setPositionSource() {
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
      properties: {
        accuracy: coords.value.accuracy === 0 ? 1 : coords.value.accuracy,
        heading: toRaw(coords.value.heading ?? 0),
        lat: toRaw(coords.value.latitude),
      },
      geometry: {
        type: "Point",
        coordinates: [toRaw(coords.value.longitude), toRaw(coords.value.latitude)],
      },
    }],
  })
}

const watchCoord = watchPausable(coords, () => {
  setPositionSource()
})

const showDataVisible = ref(false)

function zoomToPosition() {
  map.flyTo({
    center: [coords.value.longitude, coords.value.latitude],
    zoom: 15,
    duration: 0,
  })
}

const clickedPosition = ref({
  coordinate: {
    lng: 0,
    lat: 0,
  },
  pixel: {
    x: 0,
    y: 0,
  },
  visible: false,
})

function convertDDToDMS(decimalDegrees: number): string {
  const isNegative = decimalDegrees < 0
  const absoluteDegrees = Math.abs(decimalDegrees)

  const degrees = Math.floor(absoluteDegrees)
  const minutesFull = (absoluteDegrees - degrees) * 60
  const minutes = Math.floor(minutesFull)
  const seconds = Math.round((minutesFull - minutes) * 60)

  const sign = isNegative ? "-" : ""
  return `${sign}${degrees}° ${minutes}' ${seconds}"`
}

const layerManagerVisible = ref(false)

onBeforeUnmount(() => {
  layoutTitle.value = undefined
  if (map == null) {
    return
  }

  map.remove()
})

const uiBlocker = useUiBlocker()
onMounted(async () => {
  uiBlocker.show("Loading map...")
  watchCoord.pause()
  await requestPermissions()

  const style: StyleSpecification = {
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

    ],
  }

  const layers = await useProjectLayer(projectIndex).getAll()

  for (const layer of orderBy(layers, ["layerOrder"], ["asc"])) {
    match(layer.layerData)
      .with({ type: LayerDataType.XYZRASTER }, (l) => {
        style.sources[layer.id] = {
          type: "raster",
          tiles: [
            l.tileUrl,
          ],
        }

        style.layers.push({
          id: layer.id,
          type: "raster",
          source: layer.id,
        })
      })
      .with({ type: LayerDataType.GEOJSON }, (l) => {
        style.sources[layer.id] = {
          type: "geojson",
          data: l.data,
        }

        const layerStyle = layer.layerStyle as LayerStylePolygon
        style.layers.push({
          id: layer.id,
          type: "fill",
          source: layer.id,
          paint: {
            "fill-color": layerStyle.fillColor,
            "fill-opacity": 0.4,
          },
        })
        style.layers.push({
          id: `${layer.id}__line`,
          type: "line",
          source: layer.id,
          paint: {
            "line-color": layerStyle.lineColor,
            "line-width": layerStyle.lineWidth,
          },
        })
      })
      .run()

    projectLayers.value.unshift({
      id: layer.id,
      layerName: layer.layerName,
      layerStyle: layer.layerStyle,
      visible: true,
    })
  }

  style.layers.push(
    ...[
      {
        id: "userPosition",
        type: "circle",
        source: "userPosition",
        paint: {
          "circle-color": usePrimaryColor().value,
          "circle-radius": 5,
        },
      },
      {
        id: "userPositionAccuracy",
        type: "circle",
        source: "userPosition",
        paint: {
          "circle-color": usePrimaryColor().value,
          "circle-radius":
            [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              0,
              0,
              20,
              [
                "/",
                ["/", ["get", "accuracy"], 0.075],
                ["cos", ["*", ["get", "lat"], ["/", Math.PI, 180]]],
              ],
            ],

          "circle-opacity": 0.1,
          "circle-stroke-color": usePrimaryColor().value,
          "circle-stroke-width": 2,
        },
      },
      {
        id: "surveyData",
        type: "circle",
        source: "surveyData",
        paint: {
          "circle-color": "#fbf341",
          "circle-radius": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            0,
            0,
            20,
            [
              "/",
              ["/", 5, 0.075],
              ["cos", ["*", ["get", "lat"], ["/", Math.PI, 180]]],
            ],
          ],
        },
      },
    ] as LayerSpecification[],
  )

  map = new MglMap({
    container: "map",
    refreshExpiredTiles: false,
    attributionControl: false,
    style,
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
    validateStyle: true,
    canvasContextAttributes: {
      powerPreference: "low-power",
    },

  })

  try {
    await onMapLoad(map)
  }
  catch (e) {
    toast.add({
      severity: "warn",
      summary: "There might be issue on the map loading",
    })
    console.error(e)
  }

  uiBlocker.show("Waiting for gps location...")
  await until(coords).toMatch((c) => c.accuracy !== 0)
  uiBlocker.hide()
  setPositionSource()
  await loadProjectDataToMap()
  watchCoord.resume()

  zoomToPosition()

  map.on("click", (e) => {
    clickedPosition.value = {
      visible: true,
      coordinate: {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      },
      pixel: {
        x: e.point.x,
        y: e.point.y,
      },
    }
  })

  map.on("move", () => {
    if (!clickedPosition.value) {
      return
    }

    const projected = map.project(clickedPosition.value.coordinate)
    clickedPosition.value.pixel = {
      x: projected.x,
      y: projected.y,
    }
  })
})
</script>

<template>
  <div class="relative flex size-full flex-col">
    <Drawer
      v-model:visible="layerManagerVisible"
      class="!h-[60vh]"
      position="bottom"
      header="Layer Manager"
    >
      <CommonUnderConstruction />
    </Drawer>

    <Drawer
      v-model:visible="formVisible" pt:root:class="!border-0 !bg-transparent" class="!h-[90vh]"
      pt:mask:class="backdrop-blur-sm" position="bottom"
    >
      <template #container="{ closeCallback }">
        <div v-if="selectedProject != null" class="size-full">
          <FieldInputForm
            :project-data-id="projectDataIdSelected"
            :project-id="projectIndex"
            :fields="selectedProject?.fields ?? []"
            :coordinate="selectedCoordinate"
            @close="closeCallback"
            @save="() => {
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
      <SurveyDataTable
        v-if="selectedProject != null" :project-id="selectedProject.id" @edit="(dataId, geom) => {
          projectDataIdSelected = dataId
          selectedCoordinate = {
            lng: geom[0],
            lat: geom[1],
          }
          formVisible = true
          showDataVisible = false
        }"
      />
    </Drawer>

    <main class="flex grow basis-0 flex-col">
      <div class="relative grow">
        <div class="absolute bottom-0 right-0 z-10 rounded-lg p-2">
          <Button class="" severity="secondary" size="small" @click="zoomToPosition">
            <i class="i-[solar--target-line-duotone] text-xl" />
            {{ positionAccuracy.toLocaleString("id-ID") }} m
          </Button>
        </div>

        <TransitionFade>
          <KeepAlive>
            <div
              v-if="clickedPosition.visible"
              class="absolute left-0 top-0 z-[4] flex w-[250px] flex-col px-2"
              :style="{
                transform: `translate(${clickedPosition.pixel.x}px, ${clickedPosition.pixel.y}px) translate(-50%, -100%)`,
              }"
            >
              <!-- Popup Content -->
              <div class="flex flex-col rounded bg-surface-300 px-4 py-2 shadow dark:bg-surface-700">
                <div class="w-full pb-2 pt-1 text-center text-sm">
                  {{ convertDDToDMS(clickedPosition.coordinate.lng) }};{{
                    convertDDToDMS(clickedPosition.coordinate.lat)
                  }}
                </div>

                <div class="flex w-full">
                  <Button
                    severity="secondary"
                    size="small"
                    fluid
                    @click="() => {
                      showForm(clickedPosition.coordinate)
                      clickedPosition.visible = false
                    }"
                  >
                    Add data here
                  </Button>
                  <Button
                    text size="small" style="transform: translateX(8px)" @click="() => {
                      clickedPosition.visible = false
                    }"
                  >
                    <i class="i-[solar--close-circle-linear] text-2xl" />
                  </Button>
                </div>
              </div>

              <!-- Arrow Section -->
              <div class="relative self-center">
                <div class="size-0 border-x-[10px] border-t-[10px] border-x-transparent border-t-surface-300 dark:border-t-surface-700" />
              </div>
            </div>
          </KeepAlive>
        </TransitionFade>

        <!--        <div -->
        <!--          class="absolute left-0 top-0 z-[4] flex w-[250px] flex-col-reverse bg-surface-700 px-2 shadow-lg" :style="{ -->
        <!--            transform: `translate(-50%, -100%) translate(${clickedPosition.pixel.x}px, ${clickedPosition.pixel.y}px)`, -->
        <!--          }" -->
        <!--        > -->
        <!--          <div class="maplibregl-popup-tip self-center"> -->
        <!--            &lt;!&ndash;            <i class="i-[solar&#45;&#45;alt-arrow-down-bold] text-2xl" /> &ndash;&gt; -->
        <!--          </div> -->
        <!--          <Button severity="secondary" size="small" fluid> -->
        <!--            Add data here -->
        <!--          </Button> -->
        <!--        </div> -->
        <div id="map" class="map relative size-full" />
      </div>
      <div class="box-border flex grow-0 justify-between space-x-4 px-6 py-4">
        <!--        <Button severity="primary" size="small" variant="text" @click="backToHome"> -->
        <!--          Home -->
        <!--        </Button> -->
        <Button severity="primary" size="small" variant="text" @click="layerManagerVisible = true">
          Layers
        </Button>

        <Button severity="primary" size="small" variant="text" @click="showDataVisible = true">
          Show data
        </Button>

        <Button
          severity="primary" size="small" @click="() => {
            showForm()
          }"
        >
          Add data
        </Button>
      </div>
    </main>
  </div>
</template>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
