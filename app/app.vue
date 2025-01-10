<script setup lang="ts">
import { appName } from "~~/constants"
import { useUiBlocker } from "~/composables/ui/blocker"

useHead({
  title: appName,
})

const blocker = useUiBlocker()
</script>

<template>
  <NuxtPwaManifest />
  <Toast position="top-center" />
  <TransitionFade>
    <div v-if="blocker.state">
      <div class="absolute left-0 top-1/2 z-[9999999999] flex w-full flex-col items-center justify-center">
        <ProgressSpinner style="width: 50px; height: 50px" stroke-width="8" fill="transparent" />
        <div>
          {{ blocker.message }}
        </div>
      </div>
    </div>
  </TransitionFade>

  <BlockUI :blocked="blocker.state" full-screen />

  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
html,
body,
#__nuxt {
  height: 100vh;
  margin: 0;
  padding: 0;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.4s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}
</style>
