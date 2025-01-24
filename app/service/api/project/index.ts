import type { FieldConfig } from "~/composables/project/model/project"
import type { ProjectDataFeature } from "~/composables/project/model/project-data"
import type { ProjectLayer } from "~/composables/project/model/project-layer"
import type { ProjectDataUpdatePayload } from "~/service/api/project/model"
import { omit } from "es-toolkit"
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
async function submitAllImage(projectId: string, limit?: number) {
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

  const body: SubmitImagePayload = {
    projectId,
    images: rows.map((row) => ({
      id: row.id,
      image: row.image,
      projectDataId: row.projectDataId,
    })),
  }
  await useMainServiceFetch(`/projects/images/batch-create`, {
    method: "POST",
    body,
  })

  const syncAt = Date.now()
  await useDb().image.where("id").anyOf(rows.map((row) => row.id)).modify({
    syncAt,
    createdAt: syncAt,
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

async function syncProjectData(projectId: string) {
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

  await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
    method: "POST",
    body: {
      modified: rows,
      deletedKeys,
      projectVersionId: project.versionId,
    } satisfies SyncProjectDataPayload,
  })

  const syncAt = Date.now()
  await useDb().projectData.where("id").anyOf(rows.map((row) => row.id)).modify({ syncAt })
  await useDb().changesHistory.where("projectId").equals(projectId).delete()
}

/**
 * sync updated or new data
 * @param projectId
 * @param limit
 */
async function syncProjectDataUpdate(projectId: string, limit?: number) {
  const project = await useProjectStore().getById(projectId)
  if (project?.versionId == null) {
    throw new Error("need to sync")
  }

  let tableChangeQuery = useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType !== TableChangeType.Delete)
  if (limit != null) {
    tableChangeQuery = tableChangeQuery.limit(limit)
  }
  const modified = await tableChangeQuery.toArray()
  const modifiedDataId = modified.map((row) => row.dataId)
  const modifiedRowId = modified.map((row) => row.id)

  const projectDataStore = useProjectData(projectId)
  const rows = await projectDataStore.getByIds(modifiedDataId)

  await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
    method: "POST",
    body: {
      modified: rows.map((row) => {
        return {
          id: row.id,
          geom: row.data.geom,
          data: row.data.data,
        }
      }),
      deletedKeys: [],
      projectVersionId: project.versionId,
    } satisfies SyncProjectDataPayload,
  })

  const syncAt = Date.now()
  await useDb().projectData.where("id").anyOf(modifiedDataId).modify({ syncAt })
  await useDb().changesHistory.where("id").anyOf(modifiedRowId).delete()
}

/**
 * sync deleted project data id
 * @param projectId
 */
async function syncProjectDataDeleted(projectId: string) {
  const project = await useProjectStore().getById(projectId)
  if (project?.versionId == null) {
    throw new Error("need to sync")
  }

  const rows = await useDb().changesHistory.filter((row) => row.projectId === projectId && row.changeType === TableChangeType.Delete).toArray()

  await useMainServiceFetch(`/projects/${projectId}/data/sync`, {
    method: "POST",
    body: {
      modified: [],
      deletedKeys: rows.map((row) => row.dataId),
      projectVersionId: project.versionId,
    } satisfies SyncProjectDataPayload,
  })

  await useDb().changesHistory.where("id").anyOf(rows.map((row) => row.id)).delete()
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
