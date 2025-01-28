import type { ExportProgress } from "dexie-export-import"
import type { ImportProgress } from "dexie-export-import/dist/import"
import { fileOpen, fileSave, supported } from "browser-fs-access"
import { useDb } from "~/composables/project/db"
import { useAppConfig } from "~/composables/ui/app-config"
import "dexie-export-import"

export async function useDbTimeMachine() {
  const db = useDb()

  const handler = shallowRef(await db.fileHandler.toCollection().first())
  const saveHandler = async (newHandler: FileSystemFileHandle) => {
    if (handler.value != null) {
      await db.fileHandler.toCollection().delete()
    }

    await db.fileHandler.add(newHandler)
    handler.value = newHandler
  }

  const { config, state } = storeToRefs(useAppConfig())

  const backup = async (progressCallback?: (progress: ExportProgress) => void) => {
    try {
      if (handler.value != null) {
        // @ts-expect-error it is there
        if (await handler.value.queryPermission() !== "granted") {
          // @ts-expect-error it is there
          await handler.value.requestPermission()
        }
      }
      state.value.timeMachineIsInBackup = true

      const backupFile = await useDb().export({
        prettyJson: false,
        progressCallback(progress) {
          if (progressCallback != null) {
            progressCallback(progress)
          }
          return true
        },
      })

      const newHandler = await fileSave(backupFile, {
        fileName: handler.value?.name ?? "form_backup.ixdb",
        startIn: "downloads",
        id: "geoformBackup",
        description: "Backup form",
        extensions: [".ixdb"],
      }, handler.value)

      if (handler.value == null && newHandler != null) {
        await saveHandler(newHandler)
      }

      if (handler.value != null) {
        config.value.timeMachine = {
          lastUpdated: Date.now(),
          isContinuous: true,
        }
      }
    }
    finally {
      state.value.timeMachineIsInBackup = false
    }
  }

  const toggleContinuous = async () => {
    if (!supported) {
      return
    }

    if (config.value.timeMachine?.isContinuous == null) {
      config.value.timeMachine = {
        lastUpdated: undefined as number | undefined,
        isContinuous: true,
      }
    }
    else {
      config.value.timeMachine.isContinuous = !config.value.timeMachine.isContinuous
    }

    return config.value.timeMachine.isContinuous
  }

  const restore = async (progressCallback?: (progress: ImportProgress) => void) => {
    const selectedFile = await fileOpen({
      id: "geoformBackup",
      startIn: "downloads",
    })

    await useDb().delete({ disableAutoOpen: false })

    await useDb().import(selectedFile, {
      progressCallback: (progress) => {
        // eslint-disable-next-line no-console
        console.debug(progress)
        if (progressCallback) {
          progressCallback(progress)
        }
        return true
      },
      acceptVersionDiff: true,
      acceptMissingTables: true,
      skipTables: ["fileHandler"],
    })
  }

  return {
    handler,

    backup,
    restore,
    saveHandler,
    toggleContinuous,
  }
}
