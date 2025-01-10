<script setup lang="ts">
definePageMeta({
  requiresAuth: false,
})
const router = useRouter()
</script>

<template>
  <div class="flex size-full flex-col items-center justify-center">
    <div>Page Not found</div>
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
