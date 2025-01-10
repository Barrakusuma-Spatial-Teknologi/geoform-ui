<script setup lang="ts">
const props = withDefaults(defineProps<{ showLabel?: boolean }>(), {
  showLabel: false,
})
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
    size="small"
    variant="text" @click="() => {
      color = !color
    }"
  >
    <i v-if="color" class="i-[solar--moon-bold] !text-2xl" />
    <i v-else class="i-[solar--sun-bold] !text-2xl" />

    <template v-if="props.showLabel">
      Change to {{ !color ? "light" : "dark" }}
    </template>
  </Button>
</template>

<style scoped>

</style>
