import { useLocalStorage } from "@vueuse/core"
import { jwtDecode } from "jwt-decode"
import { defineStore } from "pinia"
import { AuthService } from "~/service/api/auth"

export const useAuth = defineStore("authStore", () => {
  const jwtToken = useLocalStorage("authToken", undefined as string | undefined)
  const jwtClaims = computed(() => {
    if (jwtToken.value == null) {
      return
    }

    return jwtDecode<{ sub: string, iat: number, exp: number }>(jwtToken.value)
  })
  const userId = useLocalStorage("userId", undefined as string | undefined)

  const state = useLocalStorage("authInfo", {
    username: "",
    id: "",
  })

  const isValid = computed(() => jwtToken.value != null)

  const login = async (username: string, password: string) => {
    jwtToken.value = await AuthService.login(username, password)
    // if (jwtClaims.value!.sub !== userId.value) {
    //   await useDb().delete({ disableAutoOpen: false })
    // }

    userId.value = jwtClaims.value!.sub
  }

  const getUserInfo = async () => {
    const userinfo = (await AuthService.getUserInfo(`Bearer ${jwtToken.value}`))
    state.value.username = userinfo.username
    state.value.id = userinfo.id
  }

  const logout = async () => {
    state.value.username = ""
    state.value.id = ""
    jwtToken.value = undefined
  }

  return {
    jwtToken,
    jwtClaims,
    userId,
    state,
    isValid,

    login,
    logout,
    getUserInfo,
  }
})
