import type { ProjectData, ProjectDataFeature } from "~/composables/project/model/project-data"
import destr from "destr"
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

  const add = async (
    feature: ProjectDataFeature,
    participantLocation: [longitude: number, latitude: number] | undefined,
    id?: string,
  ) => {
    const resultId = await db.projectData.add({
      id: id ?? generateId(),
      projectId,
      data: JSON.stringify(feature),
      createdAt: Date.now(),
      participantLocation,
    })

    changeTrackerChannel.publish({
      changeType: TableChangeType.Insert,
      projectId,
      dataId: resultId,
    })
  }

  const getById = async (id: string) => {
    const data = await db.projectData.get(id)
    if (data == null) {
      return
    }

    return {
      ...data,
      data: JSON.parse(data.data as string) as ProjectDataFeature,
    } as ProjectData<ProjectDataFeature>
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

  const getAll = async (pageOpt?: PaginationOption, queryOpt?: ProjectDataQueryOption) => {
    if (pageOpt != null) {
      // eslint-disable-next-line ts/no-use-before-define
      return getWithPage(pageOpt, queryOpt)
    }

    // eslint-disable-next-line ts/no-use-before-define
    const query = constructQuery(queryOpt)

    return (await query.toArray())
      .map((row) => ({
        ...row,
        data: JSON.parse(row.data as string) as ProjectDataFeature,
      }))
  }

  const getByIds = async (id: string[]) => {
    const data = await db.projectData.where("id").anyOf(id).toArray()
    if (data.length === 0) {
      return [] as ProjectData<ProjectDataFeature>[]
    }

    return data.map((row) => {
      return {
        ...row,
        data: JSON.parse(row.data as string) as ProjectDataFeature,
      }
    }) as ProjectData<ProjectDataFeature>[]
  }

  const deleteItem = async (id: string) => {
    const existing = await getById(id)
    await db.projectData.delete(id)
    await db.image.filter((row) => row.projectDataId === id).delete()
    changeTrackerChannel.publish({
      changeType: TableChangeType.Delete,
      projectId,
      dataId: id,
      existingProjectData: existing,
    })
  }

  const constructQuery = (queryOpt?: ProjectDataQueryOption) => {
    let query = db.projectData.where("projectId").equals(projectId)
    if (queryOpt != null) {
      query = query.filter((row) => {
        const fieldValue = destr<ProjectDataFeature>(row.data as string).data[queryOpt.field]
        if (fieldValue == null) {
          return false
        }

        return String(fieldValue).includes(queryOpt.keyword)
      })
    }
    return query
  }

  const count = async (queryOpt?: ProjectDataQueryOption) => {
    const query = constructQuery(queryOpt)
    return query.count()
  }

  const getWithPage = async (opt: PaginationOption, queryOpt?: ProjectDataQueryOption) => {
    const limit = opt.perPage
    const offset = (opt.page - 1) * opt.perPage

    const query = constructQuery(queryOpt)

    return (await query.offset(offset).limit(limit).toArray())
      .map((row) => ({
        ...row,
        data: JSON.parse(row.data as string) as ProjectDataFeature,
      }))
  }

  return {
    data,

    add,
    update,
    delete: deleteItem,
    getAll,
    getById,
    getByIds,

    getImage,
    addImage,
    updateImage,
    deleteImage,
    upsertImage,

    count,
  }
}

export interface ProjectDataQueryOption {
  keyword: string
  field: string
}

export interface PaginationOption {
  page: number
  perPage: number
}
