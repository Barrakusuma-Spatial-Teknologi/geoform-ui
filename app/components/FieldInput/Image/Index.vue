<script setup lang="ts">
import type { FormFieldState } from "@primevue/forms"
import type { FieldConfigImage } from "~/composables/project/model/project"

const props = defineProps<{
  defaultValue?: string
  config?: NonNullable<FieldConfigImage["fieldConfig"]>
}>()

const emits = defineEmits<{
  validated: [value: FormFieldState]
}>()

const image = defineModel<string>("image", {
  required: false,
})

const takePictureVisible = ref(false)

const {
  open,
  onChange,
} = useFileDialog({
  accept: "image/jpeg",
  multiple: false,
})

// function validateImage() {}
const toast = useToast()
onChange((files) => {
  if (files == null) {
    return
  }

  const item = files.item(0)
  if (item == null) {
    return
  }

  if (props.config != null) {
    if (props.config?.maxSize != null && item.size > mbToByte(props.config!.maxSize!)) {
      toast.add({
        severity: "error",
        life: 3000,
        summary: `Image size should be smaller than ${props.config!.maxSize} MB`,
        group: "bc",
      })
      return
    }
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

    <div v-if="image != null || props.defaultValue != null" class="flex min-h-[100px] w-[250px] items-center justify-center">
      <Image class="mb-2" :src="image ?? props.defaultValue" alt="Image" width="250" preview />
    </div>

    <div class="flex w-full justify-center">
      <ButtonGroup fluid size="small">
        <Button
          size="small" @click="() => {
            open({
              accept: props.config?.acceptedFormats?.map((f) => `.${f}`)?.join(';') ?? 'image/jpeg',
            })
          }"
        >
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
