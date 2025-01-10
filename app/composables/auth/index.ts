import { useLocalStorage } from "@vueuse/core"
import { defineStore } from "pinia"
import { AuthService } from "~/service/api/auth"

export const useAuth = defineStore("authStore", () => {
  const jwtToken = useLocalStorage("authToken", undefined as string | undefined)

  const state = ref({
    username: "",
  })

  const isValid = computed(() => jwtToken.value != null)

  const login = async (username: string, password: string) => {
    jwtToken.value = await AuthService.login(username, password)
  }

  const getUserInfo = async () => {
    state.value.usernane = (await AuthService.getUserInfo(`Bearer ${jwtToken.value}`)).username
  }

  const logout = async () => {
    state.value.usernane = ""
    jwtToken.value = undefined
  }

  return {
    jwtToken,
    state,
    isValid,

    login,
    logout,
    getUserInfo,
  }
})
