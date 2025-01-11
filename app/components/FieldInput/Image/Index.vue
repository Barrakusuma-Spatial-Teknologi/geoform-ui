<script setup lang="ts">
import type { FormFieldState } from "@primevue/forms"
import type { FieldConfigImage } from "~/composables/project/model/project"

const props = defineProps<{
  defaultValue?: string
  config?: NonNullable<FieldConfigImage["fieldConfig"]>
  $primeField?: any
}>()

const emits = defineEmits<{
  validated: [value: FormFieldState]
}>()

const image = defineModel<string>("image", {
  required: false,
})

watch(image, () => {
  console.log("emitting")

  const touched = image.value !== props.defaultValue
  //
  emits("validated", {
    value: image.value ?? props.defaultValue,
    touched,
    dirty: touched,
    valid: true,
  } as FormFieldState)
})

const takePictureVisible = ref(false)

const {
  open,
  onChange,
} = useFileDialog({
  accept: "image/*",
  multiple: false,
})

onChange((files) => {
  console.debug("changed")
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
      <Drawer v-model:visible="takePictureVisible" position="full">
        <template #container="{ closeCallback }">
          <FieldInputImageTakePictureDialog
            @captured="(img) => {
              image = img
              takePictureVisible = false
            }"
            @close="() => {
              closeCallback()
            }"
          />
        </template>
      </Drawer>
    </Teleport>

    <div v-if="image != null" class="flex min-h-[100px] w-[250px] items-center justify-center">
      <Image class="mb-2" :src="image ?? props.defaultValue" alt="Image" width="250" preview />
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
