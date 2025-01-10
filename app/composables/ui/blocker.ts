export const UiBlockerKey = Symbol("UiBlocker") as InjectionKey<Ref<boolean>>

export const useUiBlocker = defineStore("uiBlocker", () => {
  const state = ref(false)
  const message = ref("Loading...")
  const show = (mssg?: string) => {
    if (mssg != null) {
      message.value = mssg
    }

    state.value = true
  }

  const hide = () => {
    state.value = false
    message.value = "Loading..."
  }

  return {
    state,
    message,

    hide,
    show,
  }
})
