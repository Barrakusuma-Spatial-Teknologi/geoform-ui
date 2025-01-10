import type { ProjectLayer } from "~/composables/project/model/project-layer"
import { omit } from "es-toolkit"
import { useDb } from "~/composables/project/db"

export function useProjectLayer(projectId: string) {
  const db = useDb()

  const getAll = async () => {
    return db.projectLayer.filter((o) => o.projectId === projectId).toArray()
  }

  const update = async (layer: ProjectLayer) => {
    return db.projectLayer.update(layer.id, omit(layer, ["id"]))
  }

  const add = async (layer: Omit<ProjectLayer, "createdAt" | "id">, layerId?: string) => {
    const id = layerId ?? generateId()
    return db.projectLayer.add({
      id,
      ...layer,
      createdAt: Date.now(),
    })
  }

  const remove = async (layerId: string) => {
    return db.projectLayer.delete(layerId)
  }

  return {
    getAll,
    update,
    add,
    remove,
  }
}
