<script setup lang="ts">
import type { FieldConfig } from "~/composables/project/model/project"

const props = defineProps<{
  fields: FieldConfig[]
}>()

const searchQuery = defineModel<string>("searchQuery")

const searchableFieldSelected = defineModel<number>("fieldSelected", {
  default: 0,
})

const searchableFieldActive = ref(true)
const searchFieldWrapperRef = ref<HTMLDivElement>()

let outsideListener: (e: Event) => void

function bindOutsideClick(): void {
  outsideListener = (e: Event) => {
    if (e.target == null) {
      searchableFieldActive.value = false
      return
    }

    const targetEl = e.target as HTMLElement
    const isTarget = targetEl.id === searchFieldWrapperRef.value!.id
    const isTargetChild = searchFieldWrapperRef.value!.contains(targetEl)

    searchableFieldActive.value = isTarget || isTargetChild
  }
  window.addEventListener("click", outsideListener)
}

function unbindOutsideClick(): void {
  window.removeEventListener("click", outsideListener)
}

onBeforeUnmount(() => {
  unbindOutsideClick()
})

onMounted(() => {
  bindOutsideClick()
})
</script>

<template>
  <div id="searchFieldWrapper" ref="searchFieldWrapperRef" class="relative w-full">
    <InputGroup>
      <IftaLabel>
        <InputText v-model="searchQuery" input-id="searchField" size="small" />
        <label for="searchField">
          {{ props.fields[searchableFieldSelected]?.name ?? "Search" }}
        </label>
      </IftaLabel>
      <InputGroupAddon>
        <Button text severity="secondary">
          <i class="i-[solar--magnifer-linear] text-2xl" />
        </Button>
      </InputGroupAddon>
    </InputGroup>

    <TransitionFade>
      <div
        v-if="searchableFieldActive"
        class="absolute z-20 mt-2 box-border w-full rounded bg-surface-100 px-4 py-2 dark:bg-surface-800 "
      >
        <FloatLabel variant="on">
          <Select
            v-model="searchableFieldSelected"
            append-to="self"
            :options="props.fields.map((item, index) => ({ ...item, index }))" option-label="name"
            option-value="index" fluid
            size="small"
          />
          <label for="searchField">
            Search by
          </label>
        </FloatLabel>
      </div>
    </TransitionFade>
  </div>
</template>

<style scoped>

</style>
