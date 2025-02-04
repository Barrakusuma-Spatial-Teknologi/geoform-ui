import { useRollbar } from "~/plugins/01-rollbar.client"

export function captureToCloud(e: any) {
  try {
    useRollbar().error(e)
  }
  catch (e) {
    console.error(e)
  }
}
