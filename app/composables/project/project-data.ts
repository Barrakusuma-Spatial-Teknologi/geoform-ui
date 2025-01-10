import type { ProjectData, ProjectDataFeature } from "~/composables/project/model/project-data"
import { liveQuery } from "dexie"
import { changeTrackerChannel, TableChangeType, useDb } from "~/composables/project/db"
import { generateId } from "~/utils/generateId"

export function useProjectData(projectId: string) {
  const db = useDb()

  const data = useObservable<ProjectData[]>(
    // @ts-expect-error issue on typing of dixie
    liveQuery(
      async () => {
        const rows = await db
          .projectData
          .where("projectId")
          .equals(projectId)
          .toArray()

        return rows.map((row) => ({
          ...row,
          data: JSON.parse(row.data as string) as ProjectDataFeature,
        }))
      },
    ),
  )

  const addImage = async (image: string, projectDataId: string) => {
    const now = Date.now()
    return db.image.add({
      createdAt: now,
      updatedAt: now,
      image,
      projectId,
      projectDataId,
      id: generateId(),
    })
  }

  const getImage = async (id: string): Promise<string | undefined> => {
    const row = await db.image.get(id)
    return row?.image
  }

  const updateImage = async (id: string, projectDataId: string, image: string) => {
    await db.image.update(id, {
      image,
      projectDataId,
      updatedAt: Date.now(),
    })
  }

  const deleteImage = async (id: string) => {
    await db.image.delete(id)
  }

  const upsertImage = async (image: string, projectDataId: string, id?: string) => {
    if (id == null) {
      return addImage(image, projectDataId)
    }

    const existing = await getImage(id)
    if (existing == null) {
      const now = Date.now()
      await db.image.add({
        createdAt: now,
        updatedAt: now,
        image,
        projectId,
        projectDataId,
        id: id ?? generateId(),
      })
      return id
    }

    await updateImage(id, projectDataId, image)
    return id
  }

  const add = async (feature: ProjectDataFeature, id?: string) => {
    const resultId = await db.projectData.add({
      id: id ?? generateId(),
      projectId,
      data: JSON.stringify(feature),
      createdAt: Date.now(),
    })

    changeTrackerChannel.publish({
      changeType: TableChangeType.Insert,
      projectId,
      dataId: resultId,
    })
  }

  const update = async (id: string, feature: ProjectDataFeature) => {
    await db.projectData.update(id, {
      data: JSON.stringify(feature),
      projectId,
    })

    changeTrackerChannel.publish({
      changeType: TableChangeType.Update,
      projectId,
      dataId: id,
    })
  }

  const deleteItem = async (id: string) => {
    await db.projectData.delete(id)
    changeTrackerChannel.publish({
      changeType: TableChangeType.Delete,
      projectId,
      dataId: id,
    })
  }

  const getAll = async () => {
    return (await db.projectData.where("projectId").equals(projectId).toArray())
      .map((row) => ({
        ...row,
        data: JSON.parse(row.data as string) as ProjectDataFeature,
      }))
  }

  const getById = async (id: string) => {
    const data = await db.projectData.get(id)
    if (data == null) {
      return
    }

    return {
      ...data,
      data: JSON.parse(data.data as string) as ProjectDataFeature,
    }
  }

  return {
    data,

    add,
    update,
    delete: deleteItem,
    getAll,
    getById,

    getImage,
    addImage,
    updateImage,
    deleteImage,
    upsertImage,
  }
}
