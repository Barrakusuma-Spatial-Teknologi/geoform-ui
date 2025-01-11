import type { Config } from "tailwindcss"
import { addDynamicIconSelectors } from "@iconify/tailwind"
import primeUi from "tailwindcss-primeui"
// import daisyui from "daisyui"
// import themes from "daisyui/src/theming/themes"

export default {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "sans-serif"],
        mono: ["Roboto Mono Variable", "sans-serif"],
      },
    },
  },
  plugins: [
    primeUi,
    addDynamicIconSelectors({
      prefix: "i",
    }),
  ],
} satisfies Config
