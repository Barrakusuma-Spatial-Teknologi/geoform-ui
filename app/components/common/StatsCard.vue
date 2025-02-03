<script setup lang="ts">
const props = defineProps<{
  value?: number
}>()
</script>

<template>
  <div class="flex flex-col rounded-lg bg-surface-300/30 px-3 py-2 dark:bg-surface-700/80">
    <div class="text-xs text-surface-800/80 dark:text-surface-200/80">
      <slot name="label" />
    </div>
    <div class="font-mono">
      <slot>
        {{ props?.value?.toLocaleString('id-ID') ?? 0 }}
      </slot>
    </div>
  </div>
</template>

<style scoped>

</style>
