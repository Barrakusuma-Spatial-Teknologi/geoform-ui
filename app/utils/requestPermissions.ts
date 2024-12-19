// Function to request camera and geolocation permissions
export async function requestPermissions() {
  try {
    // Request camera permission
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })

    // Stop the camera stream after permission is granted
    cameraStream.getTracks().forEach((track) => track.stop())

    // Request geolocation permission
    navigator.geolocation.getCurrentPosition(
      () => {},
      (error) => {
        console.error("Geolocation access denied.", error)
        requestPermissions()
      },
    )
  }
  catch (error) {
    console.error("Camera access denied.", error)
    await requestPermissions()
  }
}
