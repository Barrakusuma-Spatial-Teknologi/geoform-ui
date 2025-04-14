import type { ProjectLayer } from "~/composables/project/model/project-layer"
import { omit } from "es-toolkit"
import { useDb } from "~/composables/project/db"

export function useProjectLayer(projectId: string) {
  const db = useDb()

  const getAll = async () => {
    return db.projectLayer.filter((o) => o.projectId === projectId).toArray()
  }

  const add = async (layer: Omit<ProjectLayer, "createdAt" | "id">, layerId?: string) => {
    const id = layerId ?? generateId()
    return db.projectLayer.add({
      id,
      ...layer,
      createdAt: Date.now(),
    })
  }

  const update = async (layer: ProjectLayer) => {
    const existing = await db.projectLayer.get(layer.id)
    if (existing == null) {
      await add(layer, layer.id)
    }

    return db.projectLayer.update(layer.id, omit(layer, ["id"]))
  }

  const remove = async (layerId?: string) => {
    if (layerId == null) {
      await db.projectLayer.toCollection().delete()
      return
    }
    return db.projectLayer.delete(layerId)
  }

  return {
    getAll,
    update,
    add,
    remove,
  }
}
