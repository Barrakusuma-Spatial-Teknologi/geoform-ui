import VConsole from "vconsole"
import { useAppConfig } from "~/composables/ui/app-config"

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev || tryParseInt(nuxtApp.$config.public?.includeVconsole) === 1) {
    // eslint-disable-next-line no-console
    console.debug("enabling VConsole")
    nuxtApp.vueApp.use(new VConsole() as Plugin<[]>)
    if (useAppConfig().config?.devTools?.enabled !== true) {
      const dom = document.querySelector(".vc-switch")
      if (dom != null) {
        const div = dom as HTMLDivElement
        div.style.display = "none"
      }
    }
  }
})

function tryParseInt(num: any) {
  if (num == null) {
    return 0
  }

  try {
    const parsed = Number.parseInt(num)
    if (Number.isNaN(parsed)) {
      return 0
    }
    return parsed
  }
  catch {
    return 0
  }
}
