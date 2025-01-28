export const useAppConfig = defineStore("geoformAppConfig", () => {
  const config = useLocalStorage("geoformAppConfig", {
    camera: {
      selected: undefined as string | undefined,
    },
    timeMachine: {
      lastUpdated: undefined as number | undefined,
      isContinuous: false,
    },
  })

  const setCamera = (cameraId: string) => {
    config.value.camera.selected = cameraId
  }

  const state = ref({
    timeMachineIsInBackup: false,
  })

  return {
    config,
    state,
    setCamera,
  }
})
