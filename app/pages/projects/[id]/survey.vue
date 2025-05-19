<script setup lang="ts">
import type { ExportProgress } from "dexie-export-import"
import type { Geometry, Point } from "geojson"
import type { GeoJSONSource, LayerSpecification, StyleSpecification } from "maplibre-gl"
import type { DrawingAction } from "~/components/DrawGeometry/model"
import type { FieldConfig } from "~/composables/project/model/project"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import bbox from "@turf/bbox"
import centroid from "@turf/centroid"
import { UseTimeAgo } from "@vueuse/components"
import { orderBy } from "es-toolkit"
import { get } from "es-toolkit/compat"
import { Map as MglMap } from "maplibre-gl"
import { type GeoJSONStoreFeatures, TerraDraw, TerraDrawPolygonMode, TerraDrawRenderMode, TerraDrawSelectMode } from "terra-draw"
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter"
import { match } from "ts-pattern"
import { submitDataCloud } from "~/components/SurveyData/submitDataCloud"
import { usePrimaryColor } from "~/composables/color"
import { useLayoutTitle } from "~/composables/layout"
import { formatLabelExpression } from "~/composables/maplibre-helper/formatLabelExpression"
import { onMapLoad } from "~/composables/maplibre-helper/onMapLoad"
import { useDbTimeMachine } from "~/composables/project/db-time-machine"
import {
  LayerDataType,
  type LayerStylePolygon,
  type LayerValidationConfig,
  type ProjectLayer,
} from "~/composables/project/model/project-layer"
import { useProjectStore } from "~/composables/project/project"
import { useProjectData } from "~/composables/project/project-data"
import { useProjectLayer } from "~/composables/project/project-layer"
import { useAppConfig } from "~/composables/ui/app-config"
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
selectedProjectFieldValue.value = selected?.fields.map((field) => ({
  ...field,
  value: undefined,
})) ?? []
const projectData = useProjectData(selectedProject.value!.id)

// const projectDataFeatures = ref<ProjectDataFeature[]>([])
const projectLayers = ref<(Pick<ProjectLayer, "layerName" | "id" | "layerStyle"> & {
  visible: true
})[]>([])
const layerAsValidation: { mode: LayerValidationConfig["mode"], id: string, name: string }[] = []
const layerAsInput: { field: string, id: string, name: string }[] = []

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

const participantLocation = computed<[number, number] | undefined>(() => {
  if (coords.value?.longitude == null || coords.value?.latitude == null) {
    return undefined
  }
  return [coords.value.longitude, coords.value.latitude]
})

const positionAccuracy = computed(() => coords.value.accuracy)

const formVisible = ref(false)
const selectedGeometry = ref<Geometry>({
  type: "Point",
  coordinates: [0, 0],
})
const inputTags = ref<string[]>()
const isEditCoordinateMode = ref<boolean>(false)

let drawGeometry!: TerraDraw
const isDrawGeometryMode = ref<boolean>(false)
const drawnFeatures = ref<GeoJSONStoreFeatures[]>([])

function startDrawGeometry() {
  isDrawGeometryMode.value = true
  drawGeometry.setMode("polygon")
}

function resetDrawGeometry() {
  for (const feature of drawnFeatures.value) {
    drawGeometry.removeFeatures([feature.id] as string[])
  }
  drawnFeatures.value = []
  drawGeometry.setMode("polygon")
}

function cancelDraw(step: number) {
  if (step === 3) {
    drawGeometry.setMode("render")
    return
  }
  if (step === 2) {
    drawGeometry.setMode("render")
    drawGeometry.setMode("polygon")
    return
  }

  isDrawGeometryMode.value = false
  resetDrawGeometry()
  drawGeometry.setMode("render")
}

function completeDraw(step: number) {
  if (step === 1) {
    drawGeometry.setMode("render")
    return
  }

  drawGeometry.setMode("render")
  isDrawGeometryMode.value = false

  const [firstFeature] = drawnFeatures.value
  if (!firstFeature) {
    return
  }

  const snapshots = drawGeometry.getSnapshotFeature(firstFeature.id as string | number)

  if (!snapshots) {
    return
  }

  const index = drawnFeatures.value.findIndex((f) => f.id === snapshots.id)

  if (index >= 0) {
    drawnFeatures.value[index] = snapshots
  }

  const [selectedFeature] = drawnFeatures.value

  if (selectedFeature) {
    showForm(selectedFeature.geometry)
  }
  drawnFeatures.value = []
}

function handleDrawUpdate(action: DrawingAction, step?: number) {
  switch (action) {
    case "cancel":
      cancelDraw(step!)
      break

    case "reset":
      resetDrawGeometry()
      break

    case "complete":
      completeDraw(step!)
      break

    case "edit":
      drawGeometry.setMode("select")
      break

    case "next":
      drawGeometry.setMode("render")
      break
  }
}

function showForm(geometryGeojson?: Geometry) {
  if (geometryGeojson != null) {
    selectedGeometry.value = geometryGeojson
  }
  else {
    selectedGeometry.value = {
      type: "Point",
      coordinates: [coords.value.longitude, coords.value.latitude],
    }
  }

  let pixelCoord
  match(selectedGeometry.value)
    .with({ type: "Point" }, (g) => {
      const longitude = g.coordinates[0] ?? 0
      const latitude = g.coordinates[1] ?? 0
      pixelCoord = map.project([longitude, latitude])
    })
    .with({ type: "Polygon" }, (g) => {
      const centerPoint = centroid(g)
      const [lng = 0, lat = 0] = centerPoint.geometry.coordinates
      pixelCoord = map.project([lng, lat])
    })

  for (const layer of layerAsValidation) {
    const features = map.queryRenderedFeatures(pixelCoord, {
      layers: [layer.id],
    })

    if (features.length > 0 && layer.mode === "forbidden") {
      toast.add({
        severity: "error",
        summary: "Invalid position",
        detail: `Position must be outside of '${layer.name}'`,
        life: 3000,
        group: "bc",
      })
      return
    }

    if (features.length === 0 && layer.mode === "inside") {
      toast.add({
        severity: "error",
        summary: "Invalid position",
        detail: `Position must be inside '${layer.name}'`,
        life: 3000,
        group: "bc",
      })

      if (drawnFeatures.value) {
        for (const feature of drawnFeatures.value) {
          drawGeometry.removeFeatures([feature.id] as string[])
        }
        drawnFeatures.value = []
        drawGeometry.setMode("render")
      }
      return
    }
  }

  if (isEditCoordinateMode.value) {
    isEditCoordinateMode.value = false
    document.querySelector(".p-drawer")?.classList.remove("!hidden")
    document.querySelector(".p-drawer-mask")?.classList.remove("!hidden")
    return
  }

  if (layerAsInput.length === 0) {
    inputTags.value = undefined
  }
  else {
    for (const layer of layerAsInput) {
      const features = map.queryRenderedFeatures(pixelCoord, {
        layers: [layer.id],
      })

      inputTags.value = features
        .map((feature) => {
          return get(feature.properties, layer.field)
        })
        .filter((tag) => tag != null)
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
async function zoomToLayer(layerId: string) {
  const sourceId = map.getLayer(layerId)?.source
  if (sourceId == null) {
    return
  }

  const source = map.getSource(sourceId) as GeoJSONSource
  if (source == null) {
    return
  }

  const extent = bbox(await source.getData())

  map.fitBounds([extent[0], extent[1], extent[2], extent[3]], {
    padding: 5,
    duration: 0,
  })
}

const uiBlocker = useUiBlocker()
const appConfig = useAppConfig()
const timeMachine = await useDbTimeMachine()

async function triggerBackup() {
  if (appConfig.config?.timeMachine?.isContinuous !== true) {
    return
  }

  if (timeMachine.handler.value == null) {
    return
  }

  await timeMachine.backup(undefined, false)
}

onBeforeUnmount(async () => {
  if (appConfig.config?.timeMachine?.isContinuous === true && timeMachine.handler.value != null) {
    try {
      if (appConfig.state.timeMachineIsInBackup) {
        // eslint-disable-next-line no-console
        console.debug("waiting backup data")
        await until(() => appConfig.state.timeMachineIsInBackup).toBe(false)
        uiBlocker.show("Waiting for background backup process...")
      }
      else {
        uiBlocker.show("Backing up data...")
        // eslint-disable-next-line no-console
        console.debug("backing up data...")

        await timeMachine.backup((progress: ExportProgress) => {
          uiBlocker.setProgress((progress.completedTables / progress.totalTables) * 100)
          return true
        })
      }
    }
    catch (error) {
      toast.add({
        severity: "error",
        closable: true,
        group: "bc",
        summary: "Failed to backup file",
        detail: get(error, "message", "Unexpected error"),
        life: 3000,
      })
    }
    finally {
      uiBlocker.hide()
    }
  }

  layoutTitle.value = undefined
  if (map == null) {
    return
  }

  map.remove()
})

function handleEditCoordinate() {
  document.querySelector(".p-drawer")?.classList.add("!hidden")
  document.querySelector(".p-drawer-mask")?.classList.add("!hidden")

  isEditCoordinateMode.value = true
}

function editCoordinateWithCurrentLocation() {
  const long = coords.value.longitude
  const lat = coords.value.latitude

  showForm({
    type: "Point",
    coordinates: [long, lat],
  })
}

onMounted(async () => {
  if (selected == null) {
    window.location.reload()
  }

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

        if (layerStyle.labelField) {
          style.layers.push({
            id: `${layer.id}__label`,
            type: "symbol",
            source: layer.id,
            paint: {
              "text-color": "#FFFFFF",
            },
            layout: {
              "text-field": formatLabelExpression(layerStyle.labelField),
              "text-size": 12,
              "text-font": ["Metropolis Regular"],
            },
          })
        }

        if (l.validation && l.validation.mode !== "off") {
          layerAsValidation.push({
            mode: l.validation.mode,
            id: layer.id,
            name: layer.layerName,
          })
        }

        if (l.inputConfig != null && l.inputConfig?.field != null) {
          layerAsInput.push({
            id: layer.id,
            name: layer.layerName,
            field: l.inputConfig!.field,
          })
        }
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
        id: "surveyData-point",
        type: "circle",
        source: "surveyData",
        filter: ["==", ["geometry-type"], "Point"],
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
      {
        id: "surveyData-polygon",
        type: "fill",
        source: "surveyData",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": "#FFE500",
          "fill-opacity": 0.2,
        },
      },
      {
        id: "surveyData-polygon-outline",
        type: "line",
        source: "surveyData",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "line-color": "#FFE500",
          "line-width": 1,
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

  if (isDrawGeometryMode.value === false) {
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
  }

  const polygonStyles: Record<string, string | number> = {
    fillColor: "#FFE500",
    fillOpacity: 0.2,
    outlineColor: "#FFE500",
    outlineWidth: 1,
  }

  // Create Terra Draw
  drawGeometry = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map }),
    modes: [
      new TerraDrawPolygonMode({
        styles: polygonStyles,
      }),
      new TerraDrawRenderMode({
        modeName: "render",
        styles: polygonStyles,
      }),
      new TerraDrawSelectMode({
        allowManualDeselection: true,
        keyEvents: {
          delete: null,
          deselect: "Escape",
          rotate: null,
          scale: null,
        },
        flags: {
          polygon: {
            feature: {
              draggable: true,
              coordinates: {
                midpoints: {
                  draggable: true,
                },
                draggable: true,
                snappable: true,
              },
            },
          },
        },
      }),
    ],
  })

  drawGeometry.start()

  drawGeometry.on(
    "finish",
    (
      id: string | number,
      context: {
        action: string
        mode: string
      },
    ) => {
      if (context.action === "draw") {
        const feature = drawGeometry.getSnapshotFeature(id)
        if (feature) {
          drawnFeatures.value.push(feature)
        }
      }
    },
  )

  drawGeometry.on("select", (id: string | number) => {
    const isAllowed = drawnFeatures.value.some((f) => f.id === id)

    if (!isAllowed) {
      drawGeometry.deselectFeature(id)
      toast.add({
        summary: "Editing Not Allowed on Selected Polygon",
        severity: "error",
        life: 3000,
      })
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
      <ul>
        <template v-for="layer in projectLayers" :key="layer.id">
          <li class="mb-2 flex w-full items-center justify-between">
            <div>{{ layer.layerName }}</div>
            <div>
              <Button
                text size="small" @click="() => {
                  zoomToLayer(layer.id)
                }"
              >
                zoom
              </Button>
            </div>
          </li>
        </template>
      </ul>
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
            :geometry="selectedGeometry"
            :participant-location="participantLocation"
            :tags="inputTags"
            @close="() => {
              projectDataIdSelected = undefined
              selectedGeometry = {
                type: 'Point',
                coordinates: [0, 0],
              }
              resetDrawGeometry()
              closeCallback()
            }"
            @save="() => {
              projectDataIdSelected = undefined
              selectedGeometry = {
                type: 'Point',
                coordinates: [0, 0],
              }
              drawnFeatures = []
              triggerBackup()
              closeCallback()
            }"

            @edit-coordinate="() => {
              handleEditCoordinate()
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
          selectedGeometry = geom,
          formVisible = true
          showDataVisible = false
        }"
      />
    </Drawer>

    <main class="flex grow basis-0 flex-col">
      <div class="relative grow">
        <div v-if="(appConfig.config?.timeMachine?.isContinuous ?? false) && timeMachine.handler.value != null" class="absolute left-0 top-0 z-10 rounded-lg p-2">
          <Button class="" severity="secondary" size="small" @click="zoomToPosition">
            <i class="i-[solar--bolt-circle-bold-duotone] text-xl text-primary" :class="appConfig.state.timeMachineIsInBackup ? 'animate-spin' : ''" />

            Backup
            <UseTimeAgo v-if="appConfig.config?.timeMachine?.lastUpdated != null" :time="appConfig.config?.timeMachine?.lastUpdated" />
          </Button>
        </div>

        <div v-if="!isEditCoordinateMode && !isDrawGeometryMode" class="absolute bottom-0 left-0 z-10 rounded-lg p-2">
          <Button class="" severity="secondary" size="small" @click="layerManagerVisible = true">
            <i class="i-[solar--layers-minimalistic-bold] text-xl" />
          </Button>
        </div>

        <div v-if="!isEditCoordinateMode && !isDrawGeometryMode" class="absolute bottom-10 left-0 z-10 rounded-lg p-2">
          <Button
            class="" severity="secondary" size="small" @click="startDrawGeometry"
          >
            <i class="i-[solar--pen-linear] text-xl" />
          </Button>
        </div>

        <div v-if="!isEditCoordinateMode && !isDrawGeometryMode" class="absolute bottom-0 right-0 z-10 rounded-lg p-2">
          <Button class="" severity="secondary" size="small" @click="zoomToPosition">
            <i class="i-[solar--target-line-duotone] text-xl" />
            {{ positionAccuracy.toLocaleString("id-ID") }} m
          </Button>
        </div>

        <TransitionFade>
          <KeepAlive>
            <div
              v-if="clickedPosition.visible && !isDrawGeometryMode"
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
                      showForm(
                        { type: 'Point',
                          coordinates: [clickedPosition.coordinate.lng, clickedPosition.coordinate.lat],
                        });
                      clickedPosition.visible = false
                    }"
                  >
                    {{ isEditCoordinateMode ? 'Use this location' : 'Add data here' }}
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
        <div id="map" class="map relative size-full" />
      </div>

      <TransitionFade>
        <KeepAlive>
          <template v-if="!isEditCoordinateMode && !isDrawGeometryMode">
            <div class="box-border flex grow-0 justify-between space-x-4 px-6 py-4">
              <Button
                severity="primary" size="small" variant="text" @click="async () => {
                  if (selectedProject == null) {
                    return
                  }

                  await submitDataCloud(selectedProject.id, toast)
                }"
              >
                <div class="i-[solar--plain-bold]" />
                Submit
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
          </template>
          <template v-else-if="!isEditCoordinateMode && isDrawGeometryMode">
            <DrawGeometry
              :features="drawnFeatures"
              @update="handleDrawUpdate"
            />
          </template>
          <template v-else>
            <div class="absolute bottom-10 left-1/2 -translate-x-1/2">
              <Button
                size="small"
                @click="editCoordinateWithCurrentLocation"
              >
                Use my location
              </Button>
            </div>
          </template>
        </KeepAlive>
      </TransitionFade>
    </main>
  </div>
</template>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
