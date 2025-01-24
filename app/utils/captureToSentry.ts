import * as Sentry from "@sentry/nuxt"
import { FetchError } from "ofetch"

export function captureToSentry(e: any) {
  if (e instanceof FetchError) {
    Sentry.setExtra("errorResponse", e.response?._data ?? e.data)
  }
  Sentry.captureException(e)
}
