import type { FetchError } from "ofetch"
import { get } from "es-toolkit/compat"

export function tryGetFetchError(err: FetchError): {
  code: number
  message: string
} {
  return get(err, "data.error")
}
