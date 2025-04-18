import { definePreset } from "@primevue/themes"
import Aura from "@primevue/themes/aura"
import mkcert from "vite-plugin-mkcert"
import { pwa } from "./config/pwa"
import { appDescription } from "./constants"

export default defineNuxtConfig({
  modules: [
    "@vueuse/nuxt",
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "@nuxtjs/color-mode",
    "@nuxt/image",
    "@vite-pwa/nuxt",
    "@nuxt/eslint",
    "@primevue/nuxt-module",
    "@morev/vue-transitions/nuxt",
    "@vee-validate/nuxt",
  ],

  plugins: [],
  ssr: false,

  devtools: {
    enabled: true,
  },

  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "page", mode: "out-in" },
    head: {
      viewport: "width=device-width,initial-scale=1",
      link: [
        {
          rel: "icon",
          href: "/favicon.ico",
          sizes: "any",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/nuxt.svg",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
      ],
      meta: [
        {
          name: "viewport",
          content: "width=device-width, height=device-height, initial-scale=1",
        },
        {
          name: "description",
          content: appDescription,
        },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ],
    },
  },

  css: [
    "~/assets/styles/main.css",
  ],

  colorMode: {
    preference: "system",
    fallback: "light",
    dataValue: "theme",
    classSuffix: "",
  },

  runtimeConfig: {
    databaseUrl: "",
    secret: "",
    public: {
      apiUrl: "",
      includeVconsole: "0",
    },
  },

  sourcemap: {
    client: "hidden",
  },

  devServer: {
    https: {
      cert: "./certs/cert.pem",
      key: "./certs/dev.pem",
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    // when using generate, payload js assets included in sw precache manifest
    // but missing on offline, disabling extraction it until fixed
    payloadExtraction: false,
    renderJsonPayloads: true,
    typedPages: true,
  },

  compatibilityDate: "2024-11-04",

  nitro: {
    esbuild: {
      options: {
        target: "esnext",
      },
    },
    prerender: {
      crawlLinks: false,
      routes: ["/", "/login"],
    },
  },

  vite: {
    plugins: [
      mkcert({
        savePath: "./certs", // save the generated certificate into certs directory
        force: true, // force generation of certs even without setting https property in the vite config
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          xfwd: true,
        },
      },
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  // auth: {
  //   provider: {
  //     type: "local",
  //     endpoints: {
  //       getSession: {path: "/currentUser"},
  //       signIn: {
  //         path: "/signin",
  //         method: "post",
  //       },
  //     },
  //     pages: {
  //       login: "/protected",
  //     },
  //     refresh: {
  //       isEnabled: true,
  //       endpoint: {
  //         path: "/refresh",
  //         method: "post",
  //       },
  //       signInResponseRefreshTokenPointer: "/token/refreshToken",
  //       refreshRequestTokenPointer: "/token/refreshToken",
  //       maxAgeInSeconds: 24 * 60 * 60,
  //     },
  //     token: {
  //       maxAgeInSeconds: 60 * 5,
  //       sameSiteAttribute: "lax",
  //       signInResponseTokenPointer: "/token/accessToken",
  //     },
  //     session: {
  //       dataType: {
  //         username: "string",
  //         roleName: "string",
  //         isAdmin: "boolean",
  //       },
  //     },
  //   },
  //   globalAppMiddleware: true,
  //   session: {
  //     enableRefreshPeriodically: 1000 * 60 * 3,
  //     enableRefreshOnWindowFocus: true,
  //   },
  // },

  primevue: {
    options: {
      ripple: true,
      theme: {
        preset: definePreset(Aura),
        options: {
          prefix: "p",
          darkModeSelector: ".dark",
          // cssLayer: false,
        },
      },
      // unstyled: true,
      // pt: {
      //   button: {
      //     root: "btn",
      //   },
      // },
    },
  },

  pwa,
  veeValidate: {
    // disable or enable auto imports
    autoImports: true,
    // Use different names for components
    componentNames: {
      Form: "VeeForm",
      Field: "VeeField",
      FieldArray: "VeeFieldArray",
      ErrorMessage: "VeeErrorMessage",
    },
  },
})
