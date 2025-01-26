<script setup lang="ts">
import { appVersion } from "~~/constants/version"
import LoginForm from "~/components/common/LoginForm.vue"

definePageMeta({
  layout: "empty",
  middleware: [],
})
</script>

<template>
  <div class="box-border size-full pt-[150px]">
    <div class="mb-8 w-full text-center text-2xl font-semibold">
      Welcome
    </div>

    <LoginForm
      @success="() => {
        navigateTo('/')
      }"
    />

    <div class="absolute bottom-4 w-full text-center text-xs text-surface-500">
      v{{ appVersion }}
    </div>
  </div>
</template>

<style scoped>

</style>
