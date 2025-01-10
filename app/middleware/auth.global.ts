import { get } from "es-toolkit/compat"
import { useAuth } from "~/composables/auth"

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const online = useOnline()
  const auth = useAuth()
  const requiresAuth = get(to.meta, "requiresAuth", true)

  // Redirect to login if authentication is required but invalid
  if (!requiresAuth) {
    if (auth.isValid && to.name === "login") {
      return navigateTo("/")
    }

    return
  }

  if (!auth.isValid) {
    return to.name === "login" ? undefined : navigateTo("/login")
  }

  // Redirect to home if offline and already authenticated
  if (!online.value && auth.isValid) {
    return to.name === "login" ? navigateTo("/") : undefined
  }

  // Fetch user info or logout if unavailable
  try {
    await auth.getUserInfo()
    if (to.name === "login") {
      return navigateTo("/")
    }
  }
  catch {
    await auth.logout()
    return navigateTo("/login")
  }
})

// export default defineNuxtRouteMiddleware(async (to, from) => {
//   if (import.meta.server) {
//     return
//   }
//
//   const online = useOnline()
//   const auth = useAuth()
//
//   const requiresAuth = get(to.meta, "requiresAuth", true)
//
//   if (!auth.isValid && requiresAuth) {
//     if (to.name === "login") {
//       return
//     }
//     return navigateTo("/login")
//   }
//
//   if (!online.value && auth.isValid) {
//     if (to.name === "login") {
//       return navigateTo("/")
//     }
//     return
//   }
//
//   try {
//     await auth.getUserInfo()
//     if (to.name === "login") {
//       return navigateTo("/")
//     }
//   }
//   catch {
//     await auth.logout()
//     return navigateTo("/login")
//   }
// })
