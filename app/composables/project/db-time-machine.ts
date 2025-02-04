import type { ExportOptions } from "dexie-export-import"
import type { ImportProgress } from "dexie-export-import/dist/import"
import { fileOpen, fileSave, supported } from "browser-fs-access"
import { tryit } from "radash"
import { useDb } from "~/composables/project/db"
import { useAppConfig } from "~/composables/ui/app-config"
import "dexie-export-import"

const DEFAULT_FILENAME = "form_backup.ixdb"

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

  const {
    config,
    state,
  } = storeToRefs(useAppConfig())

  const tryRequestPermission = async () => {
    if (handler.value == null) {
      return
    }

    if (handler.value?.queryPermission != null && await handler.value.queryPermission() !== "granted") {
      if (handler.value?.requestPermission == null) {
        return
      }
      await handler.value.requestPermission()
    }
  }

  const backup = async (progressCallback: ExportOptions["progressCallback"], useFallback: boolean = false) => {
    try {
      state.value.timeMachineIsInBackup = true

      // Check and request permission if handler exists
      await tryRequestPermission()

      // Export the database
      const backupFile = await useDb().export({
        prettyJson: false,
        progressCallback: progressCallback || (() => true),
      })

      // Handle unsupported environments
      if (!supported) {
        // eslint-disable-next-line no-console
        console.debug("using fallback download")
        download(backupFile, DEFAULT_FILENAME)
        return
      }

      // Save the backup file
      const [err, newHandler] = await tryit(fileSave)(backupFile, {
        fileName: handler.value?.name ?? DEFAULT_FILENAME,
        startIn: "downloads",
        id: "geoformBackup",
        description: "Backup form",
        extensions: [".ixdb"],
      }, handler.value)

      if (err) {
        if (err.name !== "AbortError" && useFallback) {
          // eslint-disable-next-line no-console
          console.debug("using fallback download")
          download(backupFile, DEFAULT_FILENAME)
        }
        else {
          // eslint-disable-next-line no-console
          console.debug(err)
        }
      }
      else {
        if (!handler.value && newHandler) {
          await saveHandler(newHandler)
        }

        if (handler.value) {
          config.value.timeMachine = {
            lastUpdated: Date.now(),
            isContinuous: true,
          }
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

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
