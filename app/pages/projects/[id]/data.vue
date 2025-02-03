<script setup lang="ts">
import type { Feature, FeatureCollection, Polygon } from "geojson"
import turfBbox from "@turf/bbox"
import { cellToBoundary } from "h3-js"
import { type GeoJSONSource, type LngLatBoundsLike, Map as MglMap, type StyleSpecification } from "maplibre-gl"
import StatsCard from "~/components/common/StatsCard.vue"
import { onMapLoad } from "~/composables/maplibre-helper/onMapLoad"
import { ProjectDashboardService, type ProjectSummary } from "~/service/api/dashboard"

definePageMeta({
  backTo: "/",
})

const projectId = String(useRoute().params.id)

const summary = ref<ProjectSummary>()
let map!: MglMap

const loadingH3 = ref(false)
async function loadH3() {
  loadingH3.value = true
  try {
    const h3data = await ProjectDashboardService.getH3(projectId, 10)

    const geojsonH3data = h3data.map((row) => {
      const geometry = cellToBoundary(row.h3id, true)
      return {
        id: row.h3id,
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [geometry],
        },
        properties: row,
      } satisfies Feature<Polygon>
    })
    const featureCollection: FeatureCollection = {
      type: "FeatureCollection",
      features: geojsonH3data,
    }

    const source = map.getSource("h3data") as GeoJSONSource
    source.setData(featureCollection)

    const extent = turfBbox(featureCollection) as LngLatBoundsLike
    map.fitBounds(extent, {
      animate: false,
    })
  }
  finally {
    loadingH3.value = false
  }
}

async function loadData(): Promise<void> {
  await Promise.allSettled([
    ProjectDashboardService
      .getSummary(projectId)
      .then((data) => {
        summary.value = data
      }),
    loadH3(),
  ])
}

onMounted(async () => {
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
      h3data: {
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
        id: "h3-line",
        type: "line",
        source: "h3data",
        paint: {
          "line-width": 3,
          "line-color": "#00ff00",
        },
      },
      {
        id: "h3-label",
        type: "symbol",
        source: "h3data",
        paint: {
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
          "text-halo-blur": 2,
        },
        layout: {
          "visibility": "visible",
          "text-size": 12,
          "text-font": ["Metropolis Bold"],
          "text-max-width": 0.2,
          "text-field": ["get", "count"],
        },
      },
    ],
  }

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

  await onMapLoad(map)
  await loadData()
})
</script>

<template>
  <div id="dashboard" class="box-border flex size-full flex-col gap-2 px-4 pt-4">
    <div class="grid grow-0 grid-cols-2 gap-2">
      <StatsCard :value="summary?.totalData">
        <template #label>
          Data collected
        </template>
      </StatsCard>

      <StatsCard :value="summary?.totalParticipant">
        <template #label>
          Participant
        </template>
      </StatsCard>

      <StatsCard :value="summary?.totalImage">
        <template #label>
          Image
        </template>
      </StatsCard>

      <StatsCard :value="summary?.totalImageSizeMB">
        <template #label>
          Image Size (MB)
        </template>
      </StatsCard>
    </div>
    <div class="relative w-full  grow pb-6 pt-2">
      <TransitionFade mode="out-in">
        <div v-if="loadingH3" class="absolute left-2 top-5  z-10 flex items-center space-x-2 rounded-lg bg-surface-100 px-3 py-2 text-sm dark:bg-surface-800">
          <ProgressSpinner class="size-4" />
          <div class="text-surface-800/80 dark:text-surface-200/80">
            Loading H3 data
          </div>
        </div>
      </TransitionFade>

      <div id="map" class="relative size-full overflow-hidden rounded-lg" />
    </div>
  </div>
</template>

<style>
@import "maplibre-gl/dist/maplibre-gl.css";
</style>
