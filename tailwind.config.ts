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
    // daisyui,
    primeUi,
    addDynamicIconSelectors({
      prefix: "i",
    }),
  ],
  // daisyui: {
  //   themes: [
  //     {
  //       light: {
  //         ...themes.light,
  //       },
  //     },
  //     // "dark",
  //     {
  //       dark: {
  //         ...themes.dark,
  //         "--rounded-btn": "0.5rem",
  //       },
  //     },
  //   ],
  // },
} satisfies Config
