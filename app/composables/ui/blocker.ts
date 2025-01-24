export const UiBlockerKey = Symbol("UiBlocker") as InjectionKey<Ref<boolean>>

export const useUiBlocker = defineStore("uiBlocker", () => {
  const state = ref(false)
  const message = ref("Loading...")

  const progress = ref(0)
  const progressVisible = ref(false)
  const setProgress = (progressNum: number) => {
    progressVisible.value = true
    progress.value = Number.parseFloat(progressNum.toFixed(1))
  }

  const show = (mssg?: string) => {
    if (mssg != null) {
      message.value = mssg
    }

    state.value = true
  }

  const hide = () => {
    state.value = false
    message.value = "Loading..."
    progressVisible.value = false
    progress.value = 0
  }

  return {
    progress,
    progressVisible,
    state,
    message,

    hide,
    show,
    setProgress,
  }
})
