import { migrateDatabase, trackProjectDataChanges } from "~/composables/project/db"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", () => {
    migrateDatabase()
    trackProjectDataChanges()
  })
})
