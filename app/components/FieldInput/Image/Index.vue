<script setup lang="ts">
import { TransitionFade } from "@morev/vue-transitions"

const image = defineModel<string>("image")

const takePictureVisible = ref(false)

const {
  open,
  onChange,
} = useFileDialog({
  accept: "image/*",
  multiple: false,
})

onChange((files) => {
  if (files == null) {
    return
  }

  const item = files.item(0)
  if (item == null) {
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    image.value = reader.result as string
  }
  reader.readAsDataURL(item)
})
</script>

<template>
  <div class="flex w-full flex-col">
    <Teleport to="body">
      <TransitionFade>
        <div v-if="takePictureVisible" id="capture-image" class="absolute left-0 top-0 z-[99999999999] size-full overflow-y-auto">
          <div class="box-border flex size-full basis-0 flex-col overflow-y-auto rounded-lg bg-surface-800 p-4">
            <FieldInputImageTakePictureDialog
              @captured="(img) => {
                image = img
                takePictureVisible = false
              }"
              @close="() => {
                takePictureVisible = false
              }"
            />
          </div>
        </div>
      </TransitionFade>
    </Teleport>

    <div v-if="image != null" class="flex min-h-[100px] w-[250px] items-center justify-center">
      <Image class="mb-2" :src="image" alt="Image" width="250" preview />
    </div>

    <div class="flex w-full justify-center">
      <ButtonGroup fluid size="small">
        <Button size="small" @click="open">
          Upload
        </Button>
        <Button
          size="small" @click="() => {
            takePictureVisible = true
          }"
        >
          Take Picture
        </Button>
      </ButtonGroup>
    </div>
  </div>
</template>

<style scoped>

</style>
