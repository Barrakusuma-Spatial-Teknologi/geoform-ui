import type RollbarType from "rollbar"
// @ts-expect-error let it be
import Rollbar from "rollbar/dist/rollbar.umd"
import { appVersion } from "~~/constants/version"

export const RollbarKey = Symbol("rollbar") as InjectionKey<RollbarType>
const rollbar = new Rollbar({
  accessToken: import.meta.env?.VITE_ROLLBAR_CLIENT_TOKEN ?? "",
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    environment: import.meta.env.MODE,
    appVersion,
  },
}) as RollbarType

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use({
    install(app) {
      if (import.meta.env?.VITE_ROLLBAR_CLIENT_TOKEN == null) {
        return
      }

      app.config.errorHandler = (error, vm, info) => {
        // @ts-expect-error let it be
        rollbar.error(error, {
          vueComponent: vm,
          info,
        })

        // @ts-expect-error let it be
        if (app?.config?.devtools) {
          console.error(error)
        }
      }

      app.provide(RollbarKey, rollbar)
    },
  })
})

export const useRollbar = () => {
  const value = inject(RollbarKey)
  if (value == null) {
    return rollbar
  }
  return value as RollbarType
}
