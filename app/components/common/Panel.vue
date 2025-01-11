<script setup lang="ts">
const collapsed = defineModel("collapsed", {
  required: false,
  default: true,
})
</script>

<template>
  <div class="w-full">
    <div v-ripple class="flex w-full items-center space-x-2" @click="collapsed = !collapsed">
      <Button size="small" class="!w-auto !px-0 !py-1" text severity="secondary" @click="collapsed = !collapsed">
        <template #icon>
          <div v-if="collapsed" class="i-[solar--alt-arrow-down-linear] text-xl" />
          <div v-else class="i-[solar--alt-arrow-up-linear]  text-xl" />
        </template>
      </Button>

      <div>
        <slot name="title">
          Menu
        </slot>
      </div>
    </div>

    <div v-if="!collapsed" class="mt-2">
      <slot />
    </div>
  </div>
</template>

<style scoped>

</style>
