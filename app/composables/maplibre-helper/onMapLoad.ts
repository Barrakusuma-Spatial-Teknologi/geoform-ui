import type { Map as Mapl, MapLibreEvent } from "maplibre-gl"

/**
 * Await map load with promise
 * @param map
 * @returns {Promise<MapLibreEvent>} maplibre event
 */
export function onMapLoad(map: Mapl): Promise<MapLibreEvent | null> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (map.loaded()) {
        resolve(null)
        return
      }

      reject(new Error("failed to load map, exceeded timeout"))
    }, 10000)

    map.on("load", (e) => {
      if (e == null) {
        clearTimeout(timeout)
        reject(new Error("failed to load map, map is null"))
      }

      clearTimeout(timeout)
      resolve(e)
    })
  })
}
