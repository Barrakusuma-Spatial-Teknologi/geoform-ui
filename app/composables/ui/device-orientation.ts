import { useDeviceOrientation } from "@vueuse/core"

export function useOrientation() {
  const deviceOrientation = useDeviceOrientation()
  const screenOrientation = useScreenOrientation()

  const getDeviceOrientation = (exactAngle = false) => {
    const {
      beta,
      gamma,
    } = deviceOrientation

    if (beta === null || gamma === null) {
      return 0
    }

    // Calculate the angle based on beta and gamma
    const x = beta.value // 'front to back' tilt in degrees [-180, 180]
    const y = gamma.value // 'left to right' tilt in degrees [-90, 90]
    if (y == null || x == null) {
      return 0
    }

    const rad = Math.atan2(y, x)
    let deg = rad * (180 / Math.PI)

    // Adjust with screen orientation angle
    deg = Math.round(deg + screenOrientation.angle.value)

    // Normalize to [0, 360]
    if (deg < 0) {
      deg += 360
    }

    if (exactAngle) {
      return deg
    }

    // Map to specific orientations
    if (deg > 55 && deg <= 135) {
      return 90
    }
    if (deg > 135 && deg < 225) {
      return 180
    }
    if (deg >= 225 && deg < 305) {
      return 270
    }
    return 0
  }

  const orientationAngle = ref(getDeviceOrientation())

  // Update `orientationAngle` reactively
  watch([deviceOrientation.beta, deviceOrientation.gamma, screenOrientation.angle], () => {
    orientationAngle.value = getDeviceOrientation()
  })

  const isPortrait = computed(() => orientationAngle.value === 0 || orientationAngle.value === 180)
  const isLandscape = computed(() => orientationAngle.value === 90 || orientationAngle.value === 270)
  const isPortraitDefault = computed(() => orientationAngle.value === 0)
  const isPortraitReversed = computed(() => orientationAngle.value === 180)
  const isLandscapeRight = computed(() => orientationAngle.value === 90)
  const isLandscapeLeft = computed(() => orientationAngle.value === 270)

  return {
    deviceOrientation,
    screenOrientation,
    orientationAngle,
    isPortrait,
    isLandscape,
    isPortraitDefault,
    isPortraitReversed,
    isLandscapeRight,
    isLandscapeLeft,
  }
}
