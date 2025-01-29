import type { ToastServiceMethods } from "primevue"
import { TableChangeType, useDb } from "~/composables/project/db"
import { useUiBlocker } from "~/composables/ui/blocker"
import { ProjectDataService } from "~/service/api/project"
import { captureToSentry } from "~/utils/captureToSentry"

const chunkedCount = 3
export async function submitDataCloud(projectId: string, toast: ToastServiceMethods) {
  const blocker = useUiBlocker()

  blocker.show("Submitting image")

  try {
    const imageCount = await ProjectDataService.countImageNeedSync(projectId)
    if (imageCount > 0) {
      const chunkTotal = Math.ceil(imageCount / chunkedCount)
      for (let currentChunk = 1; currentChunk <= chunkTotal; currentChunk++) {
        await ProjectDataService.submitAllImage(projectId, chunkedCount, true)
        blocker.setProgress((currentChunk / chunkTotal) * 100)
      }

      blocker.setProgress(100)
      blocker.show("Finished submitting images...")
    }
  }
  catch (e) {
    blocker.hide()
    toast.add({
      summary: "Failed to submit image",
      severity: "error",
      closable: true,
    })
    captureToSentry(e)
    return
  }

  blocker.show("Submitting data")
  try {
    blocker.setProgress(0)
    await ProjectDataService.syncProjectDataDeleted(projectId, true)
    blocker.setProgress(30)

    const rowsCount = await useDb()
      .changesHistory
      .filter((row) => row.projectId === projectId && row.changeType !== TableChangeType.Delete)
      .count()

    if (rowsCount > 0) {
      const chunkTotal = Math.ceil(rowsCount / chunkedCount)
      for (let currentChunk = 1; currentChunk <= chunkTotal; currentChunk++) {
        await ProjectDataService.syncProjectDataUpdate(projectId, chunkedCount, true)
        blocker.setProgress(30 + ((currentChunk / chunkTotal) * 70))
      }
    }

    blocker.setProgress(100)

    toast.add({
      summary: "Data submitted successfully!",
      severity: "success",
      closable: true,
      life: 6000,
    })
  }
  catch (e) {
    toast.add({
      summary: "Failed to submit data",
      severity: "error",
      closable: true,
    })
    captureToSentry(e)
  }
  finally {
    blocker.hide()
  }
}
