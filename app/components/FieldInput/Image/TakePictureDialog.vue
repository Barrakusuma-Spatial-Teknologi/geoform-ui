<script setup lang="ts">
const emits = defineEmits<{
  captured: [image: string]
  close: []
}>()

const videoRef = ref<HTMLVideoElement>()

const selectedCamera = ref<string>()
const cameraOptions = ref<{ label: string, value: string }[]>([])
watch(selectedCamera, async () => {
  if (selectedCamera.value == null) {
    return
  }

  // selectedCamera.value = cameraOptions.value.find((c) => c.value )
  videoRef.value?.pause()
  videoRef.value!.srcObject = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: selectedCamera.value as string,
    },
  })
  videoRef.value?.play()
})

function captureCamera() {
  videoRef.value?.pause()
  const canvasEl = document.createElement("canvas")

  canvasEl.width = videoRef.value!.videoWidth
  canvasEl.height = videoRef.value!.videoHeight
  const ctx = canvasEl.getContext("2d")
  if (ctx == null) {
    return
  }

  ctx.drawImage(videoRef.value!, 0, 0, canvasEl.width, canvasEl.height)

  const capturedImage = canvasEl.toDataURL("image/png")
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
  emits("captured", capturedImage)
  videoRef.value?.play()
}

onMounted(async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  cameraOptions.value = devices.filter((d) => d.kind === "videoinput").map((device) => ({
    label: device.label,
    value: device.deviceId,
  }))
  selectedCamera.value = cameraOptions.value[0]!.value
  videoRef.value!.srcObject = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: cameraOptions.value[0]!.value as string,
    },
  })
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="box-border w-full grow-0 px-4">
      <label for="camera">Camera</label>
      <Select id="camera" v-model="selectedCamera" :options="cameraOptions" option-label="label" option-value="value" fluid />
    </div>
    <video ref="videoRef" class="w-full grow" autoplay playsinline muted />

    <div class="flex w-full grow-0 justify-around py-4">
      <Button size="small" variant="text" severity="secondary" @click="emits('close')">
        Close
      </Button>

      <div class="size-20 rounded-full bg-surface-100 p-4" @click="captureCamera" />

      <Button style="visibility: hidden;" size="small" variant="text" severity="secondary">
        Close
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
