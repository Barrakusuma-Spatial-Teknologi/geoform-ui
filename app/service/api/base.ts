import type { NitroFetchOptions } from "nitropack"
import { get, omit } from "radash"
import { useAuth } from "~/composables/auth"

export interface JSendBase<T = unknown> {
  data: T
  message?: string
}

export interface MainServiceOpt extends NitroFetchOptions<string> {
  removeAuth?: boolean
  msgPack?: Uint8Array<ArrayBufferLike>
}

/**
 * Handle fetch request
 * @param path include leading slash /
 * @param opt
 */
export async function useMainServiceFetch<R, O = MainServiceOpt>(path: string, opt: O = {} as O): Promise<JSendBase<R>> {
  const auth = useAuth()
  const defaultBaseApiUrl = `${window.location.origin}/api`
  const { apiUrl = defaultBaseApiUrl } = useRuntimeConfig().public
  const apiUrlWrapped = apiUrl || defaultBaseApiUrl

  const headers = new Headers(get(opt, "headers", {}))
  if (!get(opt, "removeAuth", false)) {
    headers.set("Authorization", `Bearer ${auth.jwtToken ?? ""}`)
  }

  const msgPack = get<MainServiceOpt["msgPack"]>(opt, "msgPack", undefined)

  if (msgPack != null) {
    headers.set("Content-Type", "application/msgpack")
  }

  return await $fetch<JSendBase<R>>(apiUrlWrapped + path, {
    // @ts-expect-error need to find out the correct typing for option
    ...omit(opt, ["headers", "removeAuth"]),
    headers,
    ...(msgPack == null ? {} : { body: msgPack }),
  })
}
