export async function getCurrentLocation() {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    })

    return [position.coords.longitude, position.coords.latitude]
  }
  catch (error) {
    console.error("Error getting location:", error)
    throw new Error("Failed to get location")
  }
}
