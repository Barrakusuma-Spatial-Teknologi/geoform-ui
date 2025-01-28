import { useRuntimeConfig } from "#imports"
import * as Sentry from "@sentry/nuxt"

console.log("runtime api url =", useRuntimeConfig()?.public?.apiUrl)
Sentry.init({
  // If set up, you can use your runtime config here
  // dsn: useRuntimeConfig().public.sentry.dsn,
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  // eslint-disable-next-line node/prefer-global/process
  enabled: (process.env?.NODE_ENV ?? "production") === "production",
})
