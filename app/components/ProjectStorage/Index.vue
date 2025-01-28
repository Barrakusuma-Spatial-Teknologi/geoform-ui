<script setup lang="ts">
import { showEstimatedQuota } from "~/composables/project/persist-db"
import { prettifyBytes } from "~/utils/converter"

const estimated = await showEstimatedQuota()

const storage = ref(estimated ?? { quota: 1, estimated: 0 })
const percentage = computed(() => {
  if (storage.value == null) {
    return 0
  }

  const pct = (storage.value?.usage ?? 0) / (storage.value?.quota ?? 1)
  return Number.parseFloat((pct * 100).toFixed(2))
})

const usage = computed(() => {
  if (storage.value == null) {
    return 0
  }

  return prettifyBytes(storage.value?.usage ?? 0)
})

const quotaInMb = computed(() => {
  if (storage.value == null) {
    return 0
  }

  return prettifyBytes(storage.value?.quota ?? 0)
})

const toast = useToast()
async function setEstimatedQuota() {
  const estimated = await showEstimatedQuota()
  storage.value = estimated ?? { quota: 1, estimated: 0 }
  if (percentage.value > 95) {
    toast.add({
      summary: `Need more space: free ${(100 - percentage.value).toFixed(1)}%`,
      detail: "Please delete some data",
      severity: "warn",
      closable: true,
      group: "bc",
    })
    return
  }

  if (percentage.value > 90) {
    toast.add({
      summary: "Storage almost empty",
      detail: "Please delete some data",
      life: 3000,
      severity: "error",
    })
  }
}

onMounted(async () => {
  await setEstimatedQuota()
})
</script>

<template>
  <div class="w-full text-xs">
    <div class="relative mb-2 mt-4 flex items-center space-x-4">
      <span class="flex items-center">
        <i class="i-[solar--database-bold] mr-2 text-lg text-surface-400" />
        Local
      </span>
    </div>
    <ProgressBar :value="percentage" style="height: 14px;" class="mb-1" />
    <div class="ml-1">
      {{ usage }} of {{ quotaInMb }}
    </div>
  </div>
</template>

<style scoped>

</style>
