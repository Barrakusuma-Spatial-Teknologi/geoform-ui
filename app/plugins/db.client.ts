import { migrateDatabase, trackProjectDataChanges } from "~/composables/project/db"
import { tryPersistWithoutPromptingUser } from "~/composables/project/persist-db"

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", async () => {
    try {
      const persistStatus = await tryPersistWithoutPromptingUser()
      if (persistStatus === "prompt") {
        await navigator.storage.persist()
      }
    }
    catch (e) {
      // eslint-disable-next-line no-console
      console.debug(e)
      // eslint-disable-next-line no-console
      console.debug("unable to turn on persist")
    }

    migrateDatabase()
    trackProjectDataChanges()
  })
})
