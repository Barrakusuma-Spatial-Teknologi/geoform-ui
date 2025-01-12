<script setup lang="ts">
import { useToast } from "primevue"
import { useAppConfig } from "~/composables/ui/app-config"
import { useOrientation } from "~/composables/ui/device-orientation"

const emits = defineEmits<{
  captured: [image: string]
  close: []
}>()

const toast = useToast()
const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const { orientationAngle } = useOrientation()

const appConfig = useAppConfig()
const selectedCamera = ref<string>()
const cameraOptions = ref<{
  label: string
  value: string
}[]>([])

async function releaseCamera() {
  const videoElement = videoRef.value

  if (videoElement && videoElement.srcObject) {
    const mediaStream = videoElement.srcObject as MediaStream
    mediaStream.getTracks().forEach((track) => {
      track.stop()
    })
    videoElement.srcObject = null // Clear the video source
  }
}

async function releaseAllCamera() {
  const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
  cameraStream.getTracks().forEach((track) => track.stop())
}

async function selectCamera(cameraId: string) {
  await releaseCamera()
  await releaseAllCamera()

  videoRef.value!.srcObject = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: cameraId,
      width: { ideal: 1920 }, // Preferred width
      height: { ideal: 1080 }, // Preferred height
    },
  })

  appConfig.setCamera(cameraId)
}

watch(selectedCamera, async () => {
  if (selectedCamera.value == null) {
    return
  }

  // selectedCamera.value = cameraOptions.value.find((c) => c.value )
  videoRef.value?.pause()
  try {
    await selectCamera(selectedCamera.value as string)
  }
  catch {
    toast.add({
      detail: "Failed to use camera, reverting to the default",
      severity: "error",
      life: 3000,
    })
    selectedCamera.value = cameraOptions.value[0]!.value
    await selectCamera(selectedCamera.value as string)
  }
  finally {
    videoRef.value?.play()
  }
})

function drawRotated(source: HTMLVideoElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, degrees: number) {
  const width = canvas.width
  const height = canvas.height

  if (degrees === 90 || degrees === 270) {
    canvas.width = height
    canvas.height = width
  }

  context.save()
  if (degrees === 90) {
    context.translate(height, 0)
  }
  else if (degrees === 180) {
    context.translate(width, height)
  }
  else if (degrees === 270) {
    context.translate(0, width)
  }
  else {
    context.translate(0, 0)
  }

  context.rotate(degrees * Math.PI / 180)

  // context.drawImage(source, -source.videoWidth / 2, -source.videoWidth / 2, width, height)
  context.drawImage(source, 0, 0, source.videoWidth, source.videoHeight)
  context.restore()
}

function captureCamera() {
  videoRef.value?.pause()
  // const canvasEl = document.createElement("canvas")

  const ctx = canvasRef.value!.getContext("2d")
  if (ctx == null) {
    return
  }

  canvasRef.value!.width = videoRef.value!.videoWidth
  canvasRef.value!.height = videoRef.value!.videoHeight
  // ctx.drawImage(videoRef.value!, 0, 0, canvasRef.value!.width, canvasRef.value!.height)
  // ctx.drawImage(videoRef.value!, 0, 0, videoRef.value!.videoWidth, videoRef.value!.videoHeight)
  drawRotated(videoRef.value!, canvasRef.value!, ctx, orientationAngle.value)
  // drawRotated(videoRef.value!, canvasEl, ctx, orientationAngle.value)

  const capturedImage = canvasRef.value!.toDataURL("image/jpeg", 0.7)
  ctx.clearRect(0, 0, canvasRef.value!.width, canvasRef.value!.height)
  emits("captured", capturedImage)
  videoRef.value?.play()
}

onDeactivated(async () => {
  await releaseCamera()
  await releaseAllCamera()
})
onBeforeUnmount(async () => {
  await releaseCamera()
  await releaseAllCamera()
})

onMounted(async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  cameraOptions.value = devices.filter((d) => d.kind === "videoinput").map((device) => ({
    label: device.label,
    value: device.deviceId,
  }))

  await releaseAllCamera()

  selectedCamera.value = appConfig.config.camera.selected ?? cameraOptions.value[0]!.value as string
})
</script>

<template>
  <div class="flex size-full flex-col">
    <div class="box-border w-full grow-0 px-4">
      <label for="camera">Camera</label>
      <Select
        id="camera" v-model="selectedCamera" :options="cameraOptions" option-label="label" option-value="value"
        fluid
      />
    </div>
    <video ref="videoRef" class="max-h-[75dvh] w-full grow" autoplay playsinline muted />
    <canvas ref="canvasRef" style="display: none;" />

    <div class="flex w-full grow-0 justify-around py-4">
      <Button size="small" variant="text" severity="secondary" @click="emits('close')">
        Close
      </Button>

      <div class="size-20 rounded-full bg-surface-300 p-4 dark:bg-surface-100" @click="captureCamera" />

      <Button style="visibility: hidden;" size="small" variant="text" severity="secondary">
        Close
      </Button>
    </div>
  </div>
</template>

<style scoped>

</style>
