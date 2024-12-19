import Dexie, { type EntityTable } from "dexie"
import { nanoid } from "nanoid"

export interface ProjectLngLat {
  lng: number
  lat: number
}

// export interface ProjectData extends ProjectLngLat{
//   projectId: string
//   values: ProjectLngLat & Record<string, any>
// }

export interface ProjectData {
  id: string
  projectId: string
  feature: ProjectDataFeature
}

export type ProjectDataFeature = ProjectLngLat & Record<string, any>

export function useProjectData(projectId: string) {
  // const db = new Dexie(`data__${projectId}`)
  // db.version(1).stores

  const db = new Dexie("projectData") as Dexie & {
    projectData: EntityTable<ProjectData, "id">
  }

  if (!Object.keys(db._allTables).includes("projectData")) {
    db.version(1).stores({
      projectData: "id, projectId, feature",
    })
  }

  const add = async (feature: ProjectDataFeature, id?: string) => {
    await db.projectData.add({
      id: id ?? nanoid(),
      projectId,
      feature: JSON.stringify(feature),
    })
  }

  const update = async (id: string, feature: ProjectDataFeature) => {
    await db.projectData.update(id, {
      feature: JSON.stringify(feature),
      projectId,
    })
  }

  const deleteItem = async (id: string, feature: ProjectDataFeature) => {
    await db.projectData.delete(id)
  }

  const getAll = async () => {
    return (await db.projectData.where("projectId").equals(projectId).toArray())
      .map((row) => ({
        ...row,
        feature: JSON.parse(row.feature),
      }))
  }

  return {
    add,
    update,
    delete: deleteItem,
    getAll,
  }
}
