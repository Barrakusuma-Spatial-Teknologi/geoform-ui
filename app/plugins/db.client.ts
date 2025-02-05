import { migrateDatabase, trackProjectDataChanges } from "~/composables/project/db"

export default defineNuxtPlugin((nuxtApp) => {
  let migrated = false
  nuxtApp.hook("app:created", () => {
    if (import.meta.client) {
      migrated = true
      migrateDatabase()
      trackProjectDataChanges()
    }
  })

  nuxtApp.hook("app:mounted", async () => {
    if (!migrated) {
      migrateDatabase()
      trackProjectDataChanges()
    }
  })
})
