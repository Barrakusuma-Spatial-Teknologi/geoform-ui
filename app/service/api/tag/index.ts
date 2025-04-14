import { encode } from "@msgpack/msgpack"
import { useMainServiceFetch } from "~/service/api/base"

export interface TagResponse {
  id: string
  name: string
}

async function getAll(): Promise<TagResponse[]> {
  const res = await useMainServiceFetch<TagResponse[]>("/tags")

  return res.data
}

export interface TagCreatePayload {
  name: string
}

async function createOne(payload: TagCreatePayload): Promise<void> {
  await useMainServiceFetch<void>("/tags", {
    method: "POST",
    msgPack: encode(payload),
  })
}

async function createMany(payload: TagCreatePayload[]): Promise<void> {
  await useMainServiceFetch<void>("/tags/batch-create", {
    method: "POST",
    msgPack: encode({
      items: payload,
    }),
  })
}

export const TagsService = {
  getAll,
  createOne,
  createMany,
}
