import type {
  DBCoreMutateRequest,
  EntityTable,
} from "dexie"
import type { Project } from "~/composables/project/model/project"
import type { ProjectData, ProjectDataImage } from "~/composables/project/model/project-data"
import type { ProjectLayer } from "~/composables/project/model/project-layer"
import { MessageBroker, RSVPMediator } from "@morgan-stanley/message-broker"
import Dexie from "dexie"

export enum TableChangeType {
  Insert = "insert",
  Update = "update",
  Delete = "delete",
}

function _getChangeType(req: DBCoreMutateRequest): TableChangeType | undefined {
  if (req.type === "add") {
    return TableChangeType.Insert
  }
  else if (req.type === "put") {
    return TableChangeType.Update
  }
  else if (req.type === "delete") {
    return TableChangeType.Delete
  }
  else {
    return undefined
  }
}

export interface TableChange {
  id: string
  table: string
  projectId: string
  dataId: string
  changeType: TableChangeType
  updatedAt: number
}

type DatabaseInstance = Dexie & {
  projectLayer: EntityTable<ProjectLayer, "id">
  projectData: EntityTable<ProjectData, "id">
  project: EntityTable<Project, "id">
  image: EntityTable<ProjectDataImage, "id">
  changesHistory: EntityTable<TableChange, "id">
  fileHandler: EntityTable<FileSystemFileHandle>
}

let db!: DatabaseInstance

export function useDb() {
  if (db == null || db.hasBeenClosed()) {
    db = new Dexie("projectData") as DatabaseInstance
  }

  return db
}

export async function isStoragePersisted() {
  return await navigator.storage && navigator.storage.persisted
    && navigator.storage.persisted()
}

export function migrateDatabase() {
  const db = useDb()

  db.version(1).stores({
    project: "id, title, fields, updatedAt, createdAt, createdBy, syncAt, isCollaboration, participantQuota, participantNum, versionId",
    projectLayer: "id, title, layerName, layerOrder, layerStyle, syncAt",
    projectData: "id, projectId, data, createdBy, updatedAt, syncAt",
    image: "id, projectId, image, createdAt, syncAt",
    changesHistory: "id, table, projectId, dataId, changeType, updatedAt",
  })

  db.version(2).stores({
    image: "id, projectId, projectDataId, image, createdAt, updatedAt, syncAt",
  })

  db.version(3).stores({
    fileHandler: "++",
  })
}

const broker = new MessageBroker<{
  changeTracker: {
    changeType: TableChangeType
    projectId?: string
    dataId: string
    existingProjectData?: ProjectData
  }
}>(new RSVPMediator())

export const changeTrackerChannel = broker.create("changeTracker")

export function trackProjectDataChanges() {
  broker.get("changeTracker").subscribe(async (message) => {
    const db = useDb()

    const { data } = message
    if (data.projectId == null) {
      return
    }

    const existingProjectData = data.existingProjectData

    if (data.changeType === TableChangeType.Insert) {
      const isFromCloud = (existingProjectData?.syncAt ?? 0) >= (existingProjectData?.createdAt ?? Number.POSITIVE_INFINITY)
      if (isFromCloud) {
        return
      }

      await db.changesHistory.add({
        id: generateId(),
        changeType: TableChangeType.Insert,
        projectId: data?.projectId ?? "",
        dataId: data.dataId,
        table: "projectData",
        updatedAt: Date.now(),
      } as TableChange)

      return
    }

    const existingChange = await db.changesHistory.where("dataId").equals(data.dataId).first()
    if (data.changeType === TableChangeType.Update) {
      const isFromCloud = (existingProjectData?.syncAt ?? 0) >= (existingProjectData?.createdAt ?? Number.POSITIVE_INFINITY)
      if (isFromCloud) {
        return
      }

      if (existingChange == null) {
        await db.changesHistory.add({
          id: generateId(),
          changeType: TableChangeType.Update,
          projectId: data?.projectId ?? "",
          dataId: data.dataId,
          table: "projectData",
          updatedAt: Date.now(),
        } as TableChange)
      }
      else {
        await db.changesHistory.put({
          ...existingChange,
          changeType: TableChangeType.Update,
          updatedAt: Date.now(),
        })
      }
    }

    if (data.changeType === TableChangeType.Delete) {
      if (existingProjectData?.syncAt != null) {
        if (existingChange != null) {
          await db.changesHistory.put({
            ...existingChange,
            changeType: TableChangeType.Delete,
            updatedAt: Date.now(),
          })
          return
        }

        await db.changesHistory.add({
          id: generateId(),
          changeType: TableChangeType.Delete,
          projectId: data?.projectId ?? "",
          dataId: data.dataId,
          table: "projectData",
          updatedAt: Date.now(),
        } as TableChange)
      }
      else {
        if (existingChange == null) {
          return
        }

        await db.changesHistory.delete(existingChange.id)
      }
    }
  })
}
