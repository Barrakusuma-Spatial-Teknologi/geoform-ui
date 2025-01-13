<script setup lang="ts">
const props = defineProps<{
  projectId: string
}>()

const mode = ref<"share" | "participant">("share")

const clipboard = useClipboard()
const toast = useToast()
function copySharedLink() {
  clipboard.copy(`${window.location.origin}/projects/${props.projectId}/join`)
  toast.add({
    severity: "success",
    summary: "URL copied to clipboard",
    life: 3000,
  })
}
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="grid w-full shrink-0 grow-0 grid-cols-2 gap-x-4 pb-6">
      <Button :severity="mode === 'share' ? 'primary' : 'secondary'" @click="mode = 'share'">
        Share
      </Button>
      <Button :severity="mode === 'participant' ? 'primary' : 'secondary'" @click="mode = 'participant'">
        Participant
      </Button>
    </div>

    <TransitionFade mode="out-in">
      <KeepAlive>
        <template v-if="mode === 'share'">
          <div class="flex grow basis-0 flex-col justify-center overflow-y-scroll">
            <img :src="`/api/projects/${props.projectId}/qr`" width="300" class="mb-8 self-center overflow-hidden rounded-xl">

            <Button class="self-center" @click="copySharedLink">
              <i class="i-[solar--link-bold]" />
              Copy project link
            </Button>
          </div>
        </template>
        <template v-else>
          <LazyManageAccessParticipantList :project-id="props.projectId" />
        </template>
      </KeepAlive>
    </TransitionFade>
  </div>
</template>

<style scoped>

</style>
