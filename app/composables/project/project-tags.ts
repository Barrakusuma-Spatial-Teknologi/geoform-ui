import type { TagResponse } from "~/service/api/tag"
import { objectify } from "radash"
import { useDb } from "~/composables/project/db"

export function useProjectTags(projectId: string) {
  const db = useDb()

  const add = async (tags: TagResponse[]) => {
    await db.projectTags.filter((o) => o.projectId === projectId).delete()

    return db.projectTags.add({
      projectId,
      data: objectify(tags, (o) => o.id, (o) => o.name),
    })
  }

  const get = async () => {
    const tags = await db.projectTags.filter((o) => o.projectId === projectId).toArray()
    if (tags.length === 0) {
      return
    }

    return tags[0]?.data
  }

  const remove = async () => {
    await db.projectTags.filter((o) => o.projectId === projectId).delete()
  }

  return {
    add,
    get,
    remove,
  }
}
