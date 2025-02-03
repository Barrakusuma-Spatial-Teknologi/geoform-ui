<script setup lang="ts">
const visible = ref(false)
const hideNotice = useLocalStorage("geoformHideNotice", false)

onMounted(() => {
  visible.value = !hideNotice.value
})
</script>

<template>
  <Dialog v-model:visible="visible" modal :closable="false">
    <template #header>
      Important Notice
    </template>

    <div>
      <div class="mb-3">
        For better experience, we recommend using
        <br>
        <strong> Google Chrome or Mozilla Firefox</strong>
      </div>

      <Checkbox
        :value="hideNotice"
        binary
        @update:model-value="(value) => {
          hideNotice = value
        }"
      />
      Don't show it again
    </div>

    <template #footer>
      <Button @click="visible = false">
        Close
      </Button>
    </template>
  </Dialog>
</template>

<style scoped>

</style>
