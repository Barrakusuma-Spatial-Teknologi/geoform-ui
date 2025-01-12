<script setup lang="ts">
import type { ProjectResponse } from "~/service/api/project"
import { UseTimeAgo } from "@vueuse/components"

const props = defineProps<{
  project: ProjectResponse
}>()
</script>

<template>
  <div class="relative box-border flex w-full flex-col space-y-2 rounded-lg bg-surface-300 px-4 py-3 dark:bg-surface-800">
    <div>{{ props.project.title }}</div>
    <div class="flex w-full items-center justify-between space-x-4 text-xs">
      <div class="text-surface-400">
        <UseTimeAgo v-slot="{ timeAgo }" :time="props.project.updatedAt ?? props.project.createdAt">
          Last modified {{ timeAgo }}
        </UseTimeAgo>
      </div>

      <div class="font-bold text-primary">
        <template v-if="props.project.isCollaboration">
          COLLABORATION
        </template>
        <template v-else>
          <template v-if="props.project.participantQuota != null && props.project.participantQuota > 0">
            <div class="flex space-x-2">
              <div class="text-surface-400">
                ( {{ project.participantNum }} / {{ project.participantQuota }} )
              </div>

              <div>PUBLIC</div>
            </div>
          </template>
          <template v-else>
            PRIVATE
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
