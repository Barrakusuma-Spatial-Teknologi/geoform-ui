export const useAppConfig = defineStore("geoformAppConfig", () => {
  const config = useLocalStorage("geoformAppConfig", {
    camera: {
      selected: undefined as string | undefined,
    },
  })

  const setCamera = (cameraId: string) => {
    config.value.camera.selected = cameraId
  }

  return { config, setCamera }
})
