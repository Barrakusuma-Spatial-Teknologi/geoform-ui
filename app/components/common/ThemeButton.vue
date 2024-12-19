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
    variant="text" @click="() => {
      color = !color
    }"
  >
    <i v-if="color" class="swap-on i-[solar--moon-bold]" />
    <i v-else class="swap-off  i-[solar--sun-bold]" />
  </Button>

<!--  <label class="swap swap-rotate text-2xl"> -->
<!--    <input v-model="color" value="light" type="checkbox"> -->
<!--    <i class="swap-on i-[solar&#45;&#45;moon-bold]" /> -->
<!--    <i class="swap-off text-warning i-[solar&#45;&#45;sun-bold]" /> -->
<!--  </label> -->
</template>

<style scoped>

</style>
