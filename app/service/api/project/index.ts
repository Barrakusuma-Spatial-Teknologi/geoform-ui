import type { FieldConfig } from "~/composables/project/model/project"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import type { ProjectLayer } from "~/composables/project/model/project-layer"
import type { ProjectDataUpdatePayload } from "~/service/api/project/model"
import { encode } from "@msgpack/msgpack"
import { omit } from "es-toolkit"
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
}

export interface ProjectUpdatePayload {
  title?: string
  shareType?: "PUBLIC" | "PRIVATE"
  fields?: FieldConfig[]
  layers?: ProjectLayerNewPayload[]
  participantQuota?: number
  currentVersionId: string
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
}

async function getById(projectId: string) {
  return await useMainServiceFetch<ProjectResponse>(`/projects/${projectId}`)
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
  }

  const created = await useMainServiceFetch<ProjectUpdatedResponse>("/projects", {
    method: "POST",
    body: payload,
  })

  const syncAt = created.data?.updatedAt == null ? Date.now() : new Date(created.data.updatedAt).getTime()
  await useDb().project.update(projectId, {
    syncAt,
    updatedAt: syncAt,
    versionId: created.data.versionId,
    participantQuota: quota,
    participantNum: 0,
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
    return omit(layer, ["projectId", "createdAt"])
  })

  const payload: ProjectUpdatePayload = {
    participantQuota: project.participantQuota,
    shareType: project.participantQuota ? "PUBLIC" : "PRIVATE",
    title: project.name,
    fields: project.fields,
    layers,
    currentVersionId: project.versionId!,
  }

  const created = await useMainServiceFetch<ProjectUpdatedResponse>(`/projects/${projectId}`, {
    method: "PATCH",
    body: payload,
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
      console.debug(`failed to send message pack, falling back to json, ${e?.message}`)
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
  await db.transaction("rw", db.image, async (tx) => {
    for (const row of rowId) {
      try {
        await tx.image.where("id").equals(row).modify({
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
    }
  })
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
  deletedKeys: string[]
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
        })),
        deletedKeys: payload.deletedKeys.map((row) => UUID.parse(row).bytes),
        projectVersionId: payload.projectVersionId,
      })

      await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
        method: "POST",
        body: msgPackBody,
        headers: {
          "Content-Type": "application/msgpack",
        },
      })
      return // Exit if MessagePack succeeds
    }
    catch (e) {
      // eslint-disable-next-line no-console
      console.debug(`Failed to send MessagePack, falling back to JSON: ${e?.message}`)
    }
  }

  // Fallback to JSON if MessagePack fails or is not requested
  await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
    method: "POST",
    body: payload,
  })
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
    deletedKeys,
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
 * @param limit
 * @param msgPack
 */
async function syncProjectDataUpdate(projectId: string, limit?: number, msgPack?: boolean) {
  const project = await useProjectStore().getById(projectId)
  if (project?.versionId == null) {
    throw new Error("need to sync")
  }

  let tableChangeQuery = useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType !== TableChangeType.Delete)
  if (limit != null) {
    tableChangeQuery = tableChangeQuery.limit(limit)
  }
  const modified = await tableChangeQuery.toArray()
  if (modified.length === 0) {
    return
  }

  const modifiedDataId = modified.map((row) => row.dataId)
  const modifiedRowId = modified.map((row) => row.id)

  const projectDataStore = useProjectData(projectId)
  const rows = await projectDataStore.getByIds(modifiedDataId)

  const payload = {
    modified: rows.map((row) => ({
      id: row.id,
      geom: row.data.geom,
      data: row.data.data,
    })),
    deletedKeys: [],
    projectVersionId: project.versionId,
  } satisfies SyncProjectDataPayload

  await sendSyncRequest(projectId, payload, msgPack)

  const syncAt = Date.now()

  const db = useDb()
  await db.transaction("rw", db.projectData, async (tx) => {
    await tx.projectData.where("id").anyOf(modifiedDataId).modify({ syncAt })
  })

  await db.transaction("rw", db.changesHistory, async (tx) => {
    await tx.changesHistory.where("id").anyOf(modifiedRowId).delete()
  })
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
    deletedKeys: rows.map((row) => row.dataId),
    projectVersionId: project.versionId,
  } satisfies SyncProjectDataPayload

  await sendSyncRequest(projectId, payload, msgPack)

  const db = useDb()
  await db.transaction("rw", db.changesHistory, async (tx) => {
    await tx.changesHistory.where("id").anyOf(rows.map((row) => row.id)).delete()
  })
}

async function join(projectId: string) {
  await useMainServiceFetch(`/projects/${projectId}/join`, {
    method: "POST",
  })
}

export interface UserResponse {
  id: string
  username: string
}

async function getParticipants(projectId: string) {
  return useMainServiceFetch<UserResponse[]>(`/projects/${projectId}/participants`)
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
}
