<script setup lang="ts">

</script>

<template>
  <div class="flex size-full flex-col items-center justify-center">
    <div class="animate-zoomin animate-duration-500 animate-running animate-ease-in">
      <i class="i-[solar--folder-open-broken] text-[80px] text-surface-300 dark:text-surface-600" />
    </div>
    <div class="text-lg">
      <slot>
        Empty
      </slot>
    </div>
  </div>
</template>

<style scoped>

</style>
