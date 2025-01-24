<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
})

const router = useRouter()
const errorMessage = computed(() => {
  return router.currentRoute.value.query?.errorMessage ?? "Page Not Found"
})
</script>

<template>
  <div class="flex size-full flex-col items-center justify-center">
    <div>{{ errorMessage }}</div>
    <div>
      <Button
        text size="small" @click="() => {
          navigateTo('/login')
        }"
      >
        Back
      </Button>
    </div>
  </div>
</template>
