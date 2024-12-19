<script setup lang="ts">
const colorMode = useColorMode()

const color = ref(colorMode.value !== "dark")

function toggleColorMode(): void {
  colorMode.value = colorMode.value === "dark" ? "light" : "dark"
  colorMode.preference = colorMode.value
}

watch(color, () => {
  toggleColorMode()
})
</script>

<template>
  <Button
    :severity="color ? 'secondary' : 'warn'"
    class="!text-2xl"
    size="small"
    variant="text" @click="() => {
      color = !color
    }"
  >
    <i v-if="color" class="i-[solar--moon-bold]" />
    <i v-else class="i-[solar--sun-bold]" />
  </Button>
</template>

<style scoped>

</style>
