<script setup lang="ts">
import { objectify } from "radash"
import { type ParticipantResponse, ProjectService } from "~/service/api/project"
import { type TagResponse, TagsService } from "~/service/api/tag"

const props = defineProps<{
  projectId: string
}>()

const participants = ref<ParticipantResponse[]>()
const tagsMap = ref<Record<string, string>>({})
const tagsOption = ref<TagResponse[]>([])

onMounted(async () => {
  const tagsRes = await TagsService.getAll()
  tagsMap.value = objectify(tagsRes, (o) => o.id, (o) => o.name)
  tagsOption.value = tagsRes

  participants.value = (await ProjectService.getParticipants(props.projectId)).data
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="grow-0 pb-4">
      <IftaLabel>
        <InputNumber input-id="pquota" fluid />
        <label for="pquota">
          Participant Quota
        </label>
      </IftaLabel>
    </div>
    <div class="flex grow basis-0 flex-col overflow-y-scroll">
      <DataTable :value="participants" size="small">
        <Column header="Username" field="username" />
        <Column header="Tags" field="tagId">
          <template #body="slotProps">
            <MultiSelect
              v-model="slotProps.data.tagId" :options="tagsOption"
              option-value="id"
              option-label="name"
              filter
              placeholder="Select Cities"
              :max-selected-labels="1"
              disabled
              size="small"
              class="w-40"
            />
          </template>
        </Column>

        <Column>
          <template #body>
            <Button text severity="danger">
              <i class="i-[solar--trash-bin-2-bold] text-2xl" />
            </Button>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
