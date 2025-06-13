<script setup lang="ts">
import type { GeoJSONStoreFeatures } from "terra-draw"
import type { DrawingAction } from "./model"

const props = defineProps<{
  features: GeoJSONStoreFeatures[]
}>()

const emits = defineEmits<{
  update: [action: DrawingAction, step?: number]
}>()

enum Step {
  Initial = 1,
  Middle = 2,
  Final = 3,
}

const drawingStep = ref<Step>(Step.Initial)

function handleCancel() {
  if (drawingStep.value === Step.Final) {
    drawingStep.value = Step.Middle
    emits("update", "cancel", Step.Final)
    return
  }

  if (drawingStep.value === Step.Middle) {
    drawingStep.value = Step.Initial
    emits("update", "cancel", Step.Middle)
    return
  }

  emits("update", "cancel", Step.Initial)
}

function handleReset() {
  emits("update", "reset")
}

function handleFinish() {
  if (drawingStep.value === Step.Initial) {
    emits("update", "complete", Step.Initial)
    drawingStep.value = Step.Middle
    return
  }

  emits("update", "complete", drawingStep.value)
  drawingStep.value = Step.Initial
}

function handleNext() {
  drawingStep.value = Step.Final
  emits("update", "next")
}

function handleEdit() {
  emits("update", "edit")
}
</script>

<template>
  <div class="box-border flex grow-0 justify-between space-x-4 px-6 py-4">
    <TransitionFade>
      <KeepAlive>
        <template v-if="drawingStep === Step.Initial || drawingStep === Step.Final">
          <Button severity="secondary" size="small" fluid @click="handleCancel">
            Cancel
          </Button>

          <Button severity="primary" size="small" fluid @click="handleReset">
            Reset
          </Button>

          <Button
            :severity="props.features.length === 0 ? 'secondary' : 'primary'"
            :disabled="props.features.length === 0"
            size="small"
            fluid
            @click="handleFinish"
          >
            Finish
          </Button>
        </template>

        <template v-else>
          <Button severity="secondary" size="small" fluid @click="handleCancel">
            Cancel
          </Button>

          <Button severity="primary" size="small" fluid @click="handleEdit">
            Edit
          </Button>

          <Button severity="primary" size="small" fluid @click="handleNext">
            Next
          </Button>
        </template>
      </KeepAlive>
    </TransitionFade>
  </div>
</template>
