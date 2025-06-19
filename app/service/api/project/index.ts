import type { FieldConfig } from "~/composables/project/model/project"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import type { ProjectLayer } from "~/composables/project/model/project-layer"
import type { ProjectDataUpdatePayload } from "~/service/api/project/model"
import type { TagResponse } from "~/service/api/tag"
import { encode } from "@msgpack/msgpack"
import { chunk, omit } from "es-toolkit"
import { get } from "es-toolkit/compat"
import { sleep } from "radash"
import { UUID } from "uuidv7"
import { TableChangeType, useDb } from "~/composables/project/db"
import { useProjectStore } from "~/composables/project/project"
import { useProjectData } from "~/composables/project/project-data"
import { useProjectLayer } from "~/composables/project/project-layer"
import { useMainServiceFetch } from "~/service/api/base"

export type ProjectLayerNewPayload = Omit<ProjectLayer, "projectId" | "createdAt">

export interface ProjectNewPayload {
  id: string
  title: string
  shareType: "PUBLIC" | "PRIVATE"
  fields: FieldConfig[]
  layers?: ProjectLayerNewPayload[]
  participantQuota?: number
  maxDistance?: number
}

export interface ProjectUpdatePayload {
  title?: string
  shareType?: "PUBLIC" | "PRIVATE"
  fields?: FieldConfig[]
  layers?: ProjectLayerNewPayload[]
  participantQuota?: number
  currentVersionId: string
  maxDistance?: number
}

export interface ProjectResponse {
  id: string
  title: string
  shareType: "PUBLIC" | "PRIVATE"
  fields: FieldConfig[]
  participantQuota: number
  participantNum: number
  createdBy: string
  createdAt: string
  updatedAt?: string
  versionId?: string
  isCollaboration: boolean
  maxDistance?: number
}

export interface ProjectResponseWithTag extends ProjectResponse {
  participantTags: TagResponse[]
}

async function getById(projectId: string) {
  return await useMainServiceFetch<ProjectResponseWithTag>(`/projects/${projectId}`)
}

async function getByIdPublic(projectId: string) {
  return await useMainServiceFetch<ProjectResponse>(`/projects/${projectId}/public`)
}

async function getLayers(projectId: string) {
  return await useMainServiceFetch<ProjectLayer[]>(`/projects/${projectId}/layers`)
}

export interface ProjectUpdatedResponse {
  id: string
  updatedAt?: string
  versionId: string
}

async function saveToCloud(projectId: string, quota?: number) {
  const { getById } = useProjectStore()
  const project = await getById(projectId)
  if (project == null) {
    return
  }

  const projectLayer = useProjectLayer(projectId)
  const layers = (await projectLayer.getAll()).map((layer) => {
    return omit(layer, ["projectId", "createdAt"])
  })

  const payload: ProjectNewPayload = {
    id: projectId,
    participantQuota: quota,
    shareType: quota ? "PUBLIC" : "PRIVATE",
    title: project.name,
    fields: project.fields,
    layers,
    maxDistance: project.maxDistance,
  }

  const created = await useMainServiceFetch<ProjectUpdatedResponse>("/projects", {
    method: "POST",
    // msgPack: encode(payload),
    body: payload,
  })

  const syncAt = created.data?.updatedAt == null ? Date.now() : new Date(created.data.updatedAt).getTime()
  await useDb().project.update(projectId, {
    syncAt,
    updatedAt: syncAt,
    versionId: created.data.versionId,
    participantQuota: quota,
    participantNum: 0,
    maxDistance: project.maxDistance,
  })
}

async function update(projectId: string) {
  const { getById } = useProjectStore()
  const project = await getById(projectId)
  if (project == null) {
    return
  }

  const projectLayer = useProjectLayer(projectId)
  const layers = (await projectLayer.getAll()).map((layer) => {
    return {
      ...omit(layer, ["projectId", "createdAt"]),
      // id: UUID.parse(layer.id),
    }
  })

  const payload: ProjectUpdatePayload = {
    participantQuota: project.participantQuota,
    shareType: project.participantQuota ? "PUBLIC" : "PRIVATE",
    title: project.name,
    fields: project.fields,
    layers,
    // currentVersionId: UUID.parse(project.versionId!),
    currentVersionId: project.versionId!,
    maxDistance: project.maxDistance,
  }

  const created = await useMainServiceFetch<ProjectUpdatedResponse>(`/projects/${projectId}`, {
    method: "PATCH",
    body: payload,
    // msgPack: encode(payload),
  })

  const syncAt = created.data?.updatedAt == null ? Date.now() : new Date(created.data.updatedAt).getTime()
  await useDb().project.update(projectId, {
    syncAt,
    updatedAt: syncAt,
    versionId: created.data.versionId,
  })
}

export interface SubmitImagePayload {
  projectId: string
  images: {
    id: string
    projectDataId: string
    image: string
  }[]
}

async function submitAllImage(projectId: string, limit?: number, mssgPack?: boolean) {
  let imageQuery = useDb().image.filter((o) => {
    if (o.projectId !== projectId) {
      return false
    }

    return o.syncAt == null || o.syncAt < o.updatedAt
  })
  if (limit) {
    imageQuery = imageQuery.limit(limit)
  }
  const rows = await imageQuery.toArray()
  if (rows.length === 0) {
    return
  }

  const body: SubmitImagePayload = {
    projectId,
    images: rows.map((row) => ({
      id: row.id,
      image: row.image,
      projectDataId: row.projectDataId,
    })),
  }

  if (mssgPack) {
    try {
      const msgPackBody = encode({
        projectId: UUID.parse(projectId).bytes,
        images: rows.map((row) => ({
          id: UUID.parse(row.id).bytes,
          image: row.image,
          projectDataId: UUID.parse(row.projectDataId).bytes,
        })),
      })

      await useMainServiceFetch(`/projects/images/batch-create`, {
        method: "POST",
        body: msgPackBody,
        headers: {
          "Content-Type": "application/msgpack",
        },
      })
    }

    // }
    catch (e) {
      // eslint-disable-next-line no-console
      console.debug(`failed to send message pack, falling back to json, ${get(e, "message")}`)
      await useMainServiceFetch(`/projects/images/batch-create`, {
        method: "POST",
        body,
      })
    }
  }
  else {
    await useMainServiceFetch(`/projects/images/batch-create`, {
      method: "POST",
      body,
    })
  }

  const syncAt = Date.now()
  const rowId = rows.map((row) => row.id)

  const db = useDb()
  await db.transaction("rw", db.image, async () => {
    try {
      await db.image
        .where("id")
        .anyOf(rowId)
        .modify({
          syncAt,
          createdAt: syncAt,
        })
    }
    catch (e) {
      // eslint-disable-next-line no-console
      console.debug("ignoring error, because image uploaded")
      console.error(e)
      captureToCloud(e)
    }
  })
}

async function uploadImageNeedSync(projectId: string, chunkedCount: number = 3, progressCallback?: (progress: number) => void) {
  const syncAt = Date.now()

  const rows = await useDb().image.filter((o) => {
    if (o.projectId !== projectId) {
      return false
    }

    return o.syncAt == null || o.syncAt < o.updatedAt
  }).toArray()

  if (rows.length === 0) {
    return
  }

  const totalProgress = Math.ceil(rows.length / chunkedCount)
  if (progressCallback != null) {
    progressCallback(0)
  }

  let currentChunk = 0
  for (const group of chunk(rows, chunkedCount)) {
    const msgPackBody = encode({
      projectId: UUID.parse(projectId).bytes,
      images: group.map((row) => ({
        id: UUID.parse(row.id).bytes,
        image: row.image,
        projectDataId: UUID.parse(row.projectDataId).bytes,
      })),
    })

    await useMainServiceFetch(`/projects/images/batch-create`, {
      method: "POST",
      body: msgPackBody,
      headers: {
        "Content-Type": "application/msgpack",
      },
    })

    currentChunk += 1

    const db = useDb()
    await db.transaction("rw", db.image, async () => {
      try {
        await db.image
          .where("id")
          .anyOf(group.map((row) => row.id))
          .modify({
            syncAt,
            createdAt: syncAt,
          })
      }
      catch (e) {
        // eslint-disable-next-line no-console
        console.debug("ignoring error, because image uploaded")
        console.error(e)
      }
    })

    if (progressCallback != null) {
      progressCallback((currentChunk / totalProgress) * 100)
    }
  }

  return rows
}

interface DeletedKey {
  id: string
  version?: number
}

export interface SyncProjectDataPayload {
  deletedKeys: DeletedKey[] | []
  modified: ProjectDataUpdatePayload[]
  projectVersionId: string
}

async function countImageNeedSync(projectId: string) {
  const counted = await useDb().image.filter((o) => {
    if (o.projectId !== projectId) {
      return false
    }

    return o.syncAt == null || o.syncAt < o.updatedAt
  }).count()

  return counted
}

export interface SyncProjectDataPayload {
  deletedKeys: DeletedKey[] | []
  modified: ProjectDataUpdatePayload[]
  projectVersionId: string
}

async function sendSyncRequest(projectId: string, payload: SyncProjectDataPayload, msgPack?: boolean) {
  if (msgPack) {
    try {
      const msgPackBody = encode({
        modified: payload.modified.map((row) => ({
          ...row,
          id: UUID.parse(row.id).bytes,
          tags: UUID.parse(row.data.tags).bytes,
        })),
        deletedKeys: payload.deletedKeys.map((row) => ({
          id: UUID.parse(row.id).bytes,
          version: row.version,
        })),
        projectVersionId: payload.projectVersionId,
      })

      const result = await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
        method: "POST",
        body: msgPackBody,
        headers: {
          "Content-Type": "application/msgpack",
        },
      })
      return result.data // Exit if MessagePack succeeds
    }
    catch (e) {
      // eslint-disable-next-line no-console
      console.debug(`Failed to send MessagePack, falling back to JSON: ${get(e, "message")}`)
    }
  }
  // Fallback to JSON if MessagePack fails or is not requested
  const result = await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
    method: "POST",
    body: payload,
  })

  return result.data
}

async function syncProjectData(projectId: string, msgPack?: boolean) {
  const project = await useProjectStore().getById(projectId)
  if (project?.versionId == null) {
    throw new Error("need to sync")
  }

  const deletedKeys = await useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType === TableChangeType.Delete).primaryKeys()

  const modified = await useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType !== TableChangeType.Delete).toArray()

  const projectDataStore = useProjectData(projectId)

  const rows = (await Promise.all(modified.map(async (row) => {
    const data = await projectDataStore.getById(row.dataId)

    if (data == null) {
      return
    }

    const rowData: ProjectDataFeature = data.data

    return {
      id: data.id,
      geom: rowData.geom,
      data: rowData.data,
    } satisfies SyncProjectDataPayload["modified"][number]
  }))).filter((row) => row != null)

  const payload = {
    modified: rows,
    deletedKeys: deletedKeys.map((id) => ({ id })),
    projectVersionId: project.versionId,
  }
  await sendSyncRequest(projectId, payload, msgPack)

  const syncAt = Date.now()

  const db = useDb()
  await db.transaction("rw", db.projectData, async (tx) => {
    await tx.projectData.where("id").anyOf(rows.map((row) => row.id)).modify({ syncAt })
  })

  await db.transaction("rw", db.changesHistory, async (tx) => {
    await tx.changesHistory.where("projectId").equals(projectId).delete()
  })
}

/**
 * sync updated or new data
 * @param projectId
 * @param chunkedCount
 * @param progressCallback
 */
async function syncProjectDataUpdate(projectId: string, chunkedCount?: number, progressCallback?: (progress: number) => void) {
  const project = await useProjectStore().getById(projectId)
  if (project == null) {
    throw new Error("Project not found")
  }

  if (project?.versionId == null) {
    throw new Error("need to sync")
  }

  const tableChangeQuery = useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType !== TableChangeType.Delete)
  const modified = await tableChangeQuery.toArray()
  if (modified.length === 0) {
    return
  }

  const modifiedRowId = modified.map((row) => row.id)

  const projectDataStore = useProjectData(projectId)
  // const rows = await projectDataStore.getByIds(modifiedDataId)

  const syncAt = Date.now()
  const totalProgress = Math.ceil(modified.length / (chunkedCount ?? 3))
  if (progressCallback != null) {
    progressCallback(0)
  }

  let currentChunk = 0
  for (const changes of chunk(modified, chunkedCount ?? 3)) {
    const rows = await projectDataStore.getByIds(changes.map((row) => row.dataId))
    const currentLocation = await getCurrentLocation()
    const payload = {
      modified: rows.map((row) => (
        {
          id: row.id,
          geom: row.data.geom,
          data: row.data.data,
          tags: row.tags,
          participantLocation: row.participantLocation ?? currentLocation,
        })),
      deletedKeys: [],
      projectVersionId: project.versionId,
    } satisfies SyncProjectDataPayload
    const result = await sendSyncRequest(projectId, payload, true) as [string, number][]

    currentChunk += 1

    const db = useDb()

    try {
      await db.transaction("rw", db.projectData, async (tx) => {
        for (const [id, version] of result) {
          await tx.projectData.where("id").equals(id).modify({ syncAt, version })
        }
      })
    }
    catch (e) {
    // eslint-disable-next-line no-console
      console.debug("ignoring update error status because data already sent")
      captureToCloud(e)
    }
    try {
      await db.transaction("rw", db.changesHistory, async (tx) => {
        await tx.changesHistory.where("id").anyOf(modifiedRowId).delete()
      })
    }
    catch (e) {
    // eslint-disable-next-line no-console
      console.debug("ignoring update error status because data already sent")
      captureToCloud(e)
    }

    if (progressCallback != null) {
      progressCallback((currentChunk / totalProgress) * 100)
    }

    await sleep(200)
  }
}

/**
 * sync deleted project data id
 * @param projectId
 * @param msgPack
 */
async function syncProjectDataDeleted(projectId: string, msgPack?: boolean) {
  const project = await useProjectStore().getById(projectId)
  if (project?.versionId == null) {
    throw new Error("need to sync")
  }
  const rows = await useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType === TableChangeType.Delete).toArray()
  if (rows.length === 0) {
    return
  }

  const payload = {
    modified: [],
    deletedKeys: rows.map((row) => ({
      id: row.dataId,
      version: row.version,
    })),
    projectVersionId: project.versionId,
  } satisfies SyncProjectDataPayload

  await sendSyncRequest(projectId, payload, msgPack)

  try {
    const db = useDb()
    await db.transaction("rw", db.changesHistory, async (tx) => {
      await tx.changesHistory.where("id").anyOf(rows.map((row) => row.id)).delete()
    })
  }
  catch (e) {
    // eslint-disable-next-line no-console
    console.debug("ignoring update error status because data already sent")
    console.error(e)
  }
}

async function join(projectId: string) {
  await useMainServiceFetch(`/projects/${projectId}/join`, {
    method: "POST",
  })
}

export interface ParticipantResponse {
  id: string
  username: string
  tagId: string[]
}

async function getParticipants(projectId: string) {
  return useMainServiceFetch<ParticipantResponse[]>(`/projects/${projectId}/participants`)
}

async function removeParticipant(projectId: string, userId: string) {
  await useMainServiceFetch(`/projects/${projectId}/participant/${userId}`, {
    method: "DELETE",
  })
}

async function getAll(includeCollaboration = true) {
  return await useMainServiceFetch<ProjectResponse[]>(`/projects`, {
    query: {
      includeCollaboration,
    },
  })
}

export const ProjectService = {
  getById,
  getByIdPublic,
  getLayers,
  getAll,

  saveToCloud,
  update,

  join,

  getParticipants,
  removeParticipant,
}

export const ProjectDataService = {
  sync: syncProjectData,
  syncProjectDataDeleted,
  syncProjectDataUpdate,
  submitAllImage,
  countImageNeedSync,
  uploadImageNeedSync,
}
