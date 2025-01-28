import { showEstimatedQuota } from "~/composables/project/persist-db"

export async function checkStorageRemaining() {
  const storage = await showEstimatedQuota()
  if (storage == null) {
    return 0
  }

  const quota = storage.value.quota ?? 1
  const usage = storage.value.usage ?? quota
  const remaining = quota - usage

  return Number.parseFloat((remaining / quota).toFixed(2))
}
