import { useRollbar } from "~/plugins/01-rollbar.client"

export function captureToCloud(e: any) {
  useRollbar().error(e)
}
