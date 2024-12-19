import VConsole from "vconsole"

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev) {
    nuxtApp.vueApp.use(new VConsole() as Plugin<[]>)
  }
})
