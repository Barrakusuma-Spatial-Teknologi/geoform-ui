<script setup lang="ts">
import { ProjectService, type UserResponse } from "~/service/api/project"

const props = defineProps<{
  projectId: string
}>()

const participants = ref<UserResponse[]>()

onMounted(async () => {
  participants.value = (await ProjectService.getParticipants(props.projectId)).data
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="grow-0 pb-4">
      <IftaLabel>
        <InputNumber fluid />
        <label>
          Participant Quota
        </label>
      </IftaLabel>
    </div>
    <div class="flex grow basis-0 flex-col overflow-y-scroll">
      <ul>
        <li v-for="participant in participants" :key="participant.id" class="flex items-center justify-between">
          <div>
            {{ participant.username }}
          </div>

          <Button text severity="danger">
            <i class="i-[solar--trash-bin-2-bold] text-2xl" />
          </Button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>

</style>
