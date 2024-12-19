import { definePreset } from "@primevue/themes"
import Aura from "@primevue/themes/aura"

const preset = definePreset(Aura, {})

export default {
  preset,
  options: {
    darkModeSelector: ".p-dark",
  },
}
