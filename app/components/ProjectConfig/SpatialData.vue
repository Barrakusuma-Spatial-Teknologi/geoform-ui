<script setup lang="ts">
import type { FeatureCollection } from "geojson"
import type { TileJSON } from "maplibre-gl/src/util/util"
import type { SpatialDataLayers } from "~/components/ProjectConfig/spatialDataConfig"
import bbox from "@turf/bbox"
import { type LayerSpecification, type LngLatBoundsLike, Map as MglMap } from "maplibre-gl"
import { match } from "ts-pattern"
import SpatialDataLayer from "~/components/ProjectConfig/SpatialDataLayer.vue"
import SpatialDataLayerSelect from "~/components/ProjectConfig/SpatialDataLayerSelect.vue"
import { formatLabelExpression } from "~/composables/maplibre-helper/formatLabelExpression"
import { onMapLoad } from "~/composables/maplibre-helper/onMapLoad"
import {
  type LayerData,
  type LayerDataGeoJSON,
  LayerDataType,
  type LayerDataXYZRaster,
  type LayerStyle,
  type LayerStylePolygon,
  type LayerStyleRaster,
  LayerStyleType,
} from "~/composables/project/model/project-layer"

const layers = defineModel<SpatialDataLayers[]>("layers", {
  required: true,
})

const addLayerVisible = ref(false)

let map!: MglMap

function setLayerVisible(layerId: string, visible: boolean) {
  for (const layerName of map.getLayersOrder()) {
    if (!layerName.includes(layerId)) {
      continue
    }

    map.setLayoutProperty(layerName, "visibility", visible ? "visible" : "none")
  }
}

function zoomToGeoJSON(geojson: FeatureCollection) {
  const extent = bbox(geojson)
  map.fitBounds(extent as unknown as LngLatBoundsLike, {
    animate: false,
  })
}

const toast = useToast()

function addLayer(layerName: string, layer: LayerData, bounds?: TileJSON["bounds"]) {
  if (layer.type === LayerDataType.XYZVECTOR) {
    return
  }

  const layerId = generateId()

  if (layer.type === LayerDataType.XYZRASTER) {
    map.addSource(layerId, {
      type: "raster",
      tiles: [layer.tileUrl],
    })

    map.addLayer({
      id: layerId,
      type: "raster",
      source: layerId,
    })

    layers.value.unshift({
      id: layerId,
      layerName,
      layerStyle: {
        type: LayerStyleType.RASTER,
        opacity: 100,
      } as LayerStyleRaster,
      layerData: layer,
      visible: true,
    })

    if (bounds != null) {
      map.fitBounds(bounds)
    }
    return
  }

  if (layer.data.features.length === 0) {
    toast.add({
      severity: "error",
      summary: "Empty features",
    })
    return
  }

  // const geometryType = layer.value.data.features[0]!.geometry.type
  map.addSource(layerId, {
    type: "geojson",
    data: layer.data,
  })
  addLayerGeoJSON(layerName, layerId, layer)
  zoomToGeoJSON(layer.data)
}

function addLayerGeoJSON(layerName: string, layerId: string, layer: LayerDataGeoJSON) {
  const geometryType = layer.data.features[0]!.geometry.type
  const baseLayer = {
    id: layerId,
    layerData: layer,
    layerName,
    visible: true,
  }

  if (geometryType.includes("Point")) {
    addLayerWithStyle(layerId, {
      ...baseLayer,
      layerStyle: {
        type: LayerStyleType.POINT,
        pointColor: "#07bb07",
      },
    }, {
      id: layerId,
      type: "circle",
      source: layerId,
      paint: {
        "circle-color": "#07bb07",
        "circle-radius": 5,
      },
    })
  }
  else if (geometryType.includes("Polygon")) {
    addLayerWithStyle(layerId, {
      ...baseLayer,
      layerStyle: {
        type: LayerStyleType.POLYGON,
        fillColor: "#07bb07",
        lineColor: "#07bb07",
        lineWidth: 4,
      },
    }, {
      id: layerId,
      type: "fill",
      source: layerId,
      paint: {
        "fill-color": "#07bb07",
        "fill-opacity": 0.5,
      },
    }, {
      id: `${layerId}__line`,
      type: "line",
      source: layerId,
      paint: {
        "line-color": "#07bb07",
        "line-width": 4,
      },
    })
  }
  else {
    addLayerWithStyle(layerId, {
      ...baseLayer,
      layerStyle: {
        type: LayerStyleType.LINE,
        lineColor: "#07bb07",
        lineWidth: 4,
      },
    }, {
      id: layerId,
      type: "line",
      source: layerId,
      paint: {
        "line-color": "#07bb07",
      },
    })
  }
}

function addLayerWithStyle(_layerId: string, layerConfig: any, ...mapLayers: LayerSpecification[]) {
  const isSymbolLayer = layerConfig.layerStyle.labelField != null

  if (!isSymbolLayer) {
    layers.value.unshift(layerConfig)
  }

  mapLayers.forEach((layer) => map.addLayer(layer))
}

const editLayerStyleVisible = ref(false)
const editLayerStyleIndex = ref<number>()

function setLayerStyle() {
  const selectedLayer = layers.value[editLayerStyleIndex.value!]
  if (selectedLayer == null) {
    return
  }
  const layerStyle: LayerStyle = selectedLayer.layerStyle!

  if (layerStyle.type === LayerStyleType.POINT) {
    map.setPaintProperty(selectedLayer.id, "circle-color", selectedLayer.layerStyle!.pointColor)
  }
  else if (layerStyle.type === LayerStyleType.POLYGON) {
    const stylePolygon = selectedLayer.layerStyle as LayerStylePolygon

    map.setPaintProperty(selectedLayer.id, "fill-color", stylePolygon.fillColor)
    map.setPaintProperty(`${selectedLayer.id}__line`, "line-color", stylePolygon.lineColor)
    // map.setPaintProperty(`${selectedLayer.id}__line`, "line-width", stylePolygon.lineWidth)
  }
  else {
    map.setPaintProperty(selectedLayer.id, "line-color", selectedLayer.layerStyle!.lineColor)
    map.setPaintProperty(selectedLayer.id, "line-width", selectedLayer.layerStyle!.lineWidth)
  }
}

function removeLayer(layerIndex: number) {
  const selectedLayer = layers.value[layerIndex]
  if (selectedLayer == null) {
    return
  }
  const layerId = selectedLayer.id

  for (const layerName of map.getLayersOrder()) {
    if (!layerName.includes(layerId)) {
      continue
    }

    map.removeLayer(layerName)
  }

  layers.value.splice(layerIndex, 1)
}

onBeforeUnmount(() => {
  if (map == null) {
    return
  }

  map.remove()
})

function addLabelLayerToMap(
  labelLayerName: string,
  labelLayerId: string,
  labelLayerData: LayerDataGeoJSON,
  labelField: string[],
) {
  const originalLayerId = labelLayerId.split("__")[0]
  if (!map.getLayer(labelLayerId)) {
    const baseLayer = {
      id: labelLayerId,
      layerData: labelLayerData,
      layerName: labelLayerName,
      visible: true,
    }
    addLayerWithStyle(labelLayerId, {
      ...baseLayer,
      layerStyle: {
        labelField,
      },
    }, {
      id: labelLayerId,
      type: "symbol",
      source: originalLayerId!,
      paint: {
        "text-color": "#FFFFFF",
      },
      layout: {
        "text-field": formatLabelExpression(labelField),
        "text-size": 12,
        "text-font": ["Metropolis Regular"],
      },
    })
  }

  map.setLayoutProperty(labelLayerId, "text-field", formatLabelExpression(labelField))
}

onMounted(async () => {
  map = new MglMap({
    container: "map",
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
      },
      layers: [
        {
          type: "raster",
          id: "basemap",
          source: "basemapOsm",
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
    canvasContextAttributes: {
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    },
  })

  await onMapLoad(map)

  for (const layer of layers.value) {
    const style = layer.layerStyle == null
    if (style == null) {
      continue
    }

    if (!layer.layerData) {
      return
    }

    if (layer.layerData.type === LayerDataType.XYZRASTER) {
      map.addSource(layer.id, {
        type: "raster",
        tiles: [(layer.layerData as LayerDataXYZRaster).tileUrl],
      })

      map.addLayer({
        id: layer.id,
        source: layer.id,
        type: "raster",
      })
    }
    else if (layer.layerData.type === LayerDataType.GEOJSON) {
      if (layer.layerData.validation == null) {
        layer.layerData.validation = { mode: "off" }
      }

      map.addSource(layer.id, {
        type: "geojson",
        data: layer.layerData.data,
      })
      match(layer.layerStyle)
        .with({ type: LayerStyleType.POLYGON }, (layerStyle) => {
          map.addLayer({
            id: layer.id,
            type: "fill",
            source: layer.id,
            paint: {
              "fill-color": layerStyle.fillColor,
              "fill-opacity": 0.4,
            },
          })

          map.addLayer({
            id: `${layer.id}__line`,
            type: "line",
            source: layer.id,
            paint: {
              "line-color": layerStyle.lineColor,
              "line-width": layerStyle.lineWidth,
            },
          })

          if (layerStyle.labelField) {
            map.addLayer({
              id: `${layer.id}__label`,
              type: "symbol",
              source: layer.id,
              paint: {
                "text-color": "#FFFFFF",
                "text-halo-color": "#000000",
                "text-halo-width": 2,
              },
              layout: {
                "text-field": formatLabelExpression(layerStyle.labelField),
                "text-size": 12,
                "text-font": ["Metropolis Regular"],
              },
            })
          }
        })
        .with({ type: LayerStyleType.LINE }, (layerStyle) => {
          map.addLayer({
            id: layer.id,
            type: "line",
            source: layer.id,
            paint: {
              "line-color": layerStyle.lineColor,
              "line-width": layerStyle.lineWidth,
            },
          })
        })
        .with({ type: LayerStyleType.POINT }, (layerStyle) => {
          map.addLayer({
            id: layer.id,
            type: "circle",
            source: layer.id,
            paint: {
              "circle-color": layerStyle.pointColor,
            },
          })
          if (layerStyle.labelField) {
            map.addLayer({
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
        })
        .run()

      zoomToGeoJSON(layer.layerData.data)
    }
  }
})
</script>

<template>
  <div class="box-border flex size-full grow basis-0 flex-col overflow-y-scroll px-4">
    <Drawer
      v-model:visible="addLayerVisible"
      pt:mask:class="backdrop-blur-sm" position="bottom"
      style="height: auto"
    >
      <SpatialDataLayerSelect
        @add-data="(...d) => {
          addLayer(...d)
          addLayerVisible = false
        }" @close="addLayerVisible = false"
      />
    </Drawer>

    <Drawer
      v-model:visible="editLayerStyleVisible"
      position="bottom"
      pt:mask:class="!bg-transparent"
      style="height: auto"
      header="Layer style"
    >
      <SpatialDataLayer
        v-if="editLayerStyleVisible && editLayerStyleIndex != null"
        v-model:layer="layers[editLayerStyleIndex]!"
        v-model:style="layers[editLayerStyleIndex]!.layerStyle"
        @change-style="setLayerStyle"
        @add-label-layer-to-map="addLabelLayerToMap"
      />
    </Drawer>

    <div class="h-[200px] w-full shrink-0 grow-0 overflow-hidden rounded-xl">
      <div id="map" class="map relative size-full" />
    </div>
    <div class="box-border w-full grow basis-0 overflow-y-auto pt-4">
      <template v-for="(layer, layerIndex) in layers" :key="layer.key">
        <div class="flex w-full items-center gap-x-2 border-b border-surface-600 p-2">
          <div class="grow-0">
            <div class="i-[material-symbols--drag-indicator]" />
          </div>

          <div class="grow">
            {{ layer.layerName }}
          </div>

          <div class="flex min-w-[120px] grow-0 justify-end gap-x-1">
            <Button
              text severity="secondary" size="small" @click="() => {
                editLayerStyleIndex = layerIndex
                editLayerStyleVisible = true
              }"
            >
              <i class="i-[solar--pallete-2-outline] text-xl" />
            </Button>

            <Button
              text severity="secondary" size="small" @click="() => {
                removeLayer(layerIndex)
              }"
            >
              <i class="i-[solar--trash-bin-2-bold] text-xl" />
            </Button>

            <Button
              severity="secondary"
              size="small"
              text @click="() => {
                layer.visible = !layer.visible
                setLayerVisible(layer.id, layer.visible)
              }"
            >
              <template v-if="layer.visible">
                <i class="i-[solar--eye-bold] text-xl" />
              </template>
              <template v-else>
                <i class="i-[solar--eye-closed-bold] text-xl" />
              </template>
            </Button>
          </div>
        </div>
      </template>
    </div>
    <div class="w-full shrink-0 grow-0">
      <Button fluid outlined @click="addLayerVisible = true">
        Add Layer
      </Button>
    </div>
  </div>
</template>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
