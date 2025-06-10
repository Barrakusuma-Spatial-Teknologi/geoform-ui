export async function getCurrentLocation(timeout: number = 5000) {
  try {
    const position = await new Promise<GeolocationPosition | undefined>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (e) => {
        if (e.code === e.TIMEOUT) {
          resolve(undefined)
        }
        reject(new Error(e.message, { cause: e }))
      }, { enableHighAccuracy: true, timeout })
    })

    if (position == null) {
      return
    }

    return [position.coords.longitude, position.coords.latitude]
  }
  catch (error) {
    console.error("Error getting location:", error)
    throw new Error("Failed to get location")
  }
}
