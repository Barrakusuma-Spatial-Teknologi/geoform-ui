import type { Observable } from "rxjs"
import type { ProjectData, ProjectDataFeature } from "~/composables/project/model/project-data"
import type { ProjectResponse } from "~/service/api/project"
import { useObservable } from "@vueuse/rxjs"
import { liveQuery } from "dexie"
import { omit } from "es-toolkit"
import { match } from "ts-pattern"
import { useDb } from "~/composables/project/db"
import { type FieldConfig, type FieldConfigCheckbox, FieldType, type Project } from "~/composables/project/model/project"
import { generateId } from "~/utils/generateId"

export function useProjectStore() {
  const db = useDb()

  // @ts-expect-error peer deps issue
  const observable: Observable<Project[]> = liveQuery(() => db.project.toCollection().sortBy("updatedAt"))
  const projects = useObservable<Project[]>(observable)

  const getById = async (projectId: string) => {
    return db.project.get(projectId)
  }

  const save = async (project: Omit<Project, "id">, projectId?: string) => {
    const id = projectId ?? generateId()
    return db.project.add({
      id,
      ...project,
    }, id)
  }

  const saveFromCloud = async (project: ProjectResponse) => {
    const syncAt = Date.now()
    return save({
      syncAt,
      createdAt: syncAt,
      participantQuota: project.participantQuota,
      fields: project.fields,
      name: project.title,
      isCollaboration: true,
      createdBy: project.createdBy,
      participantNum: project.participantNum,
      versionId: project.versionId,
    }, project.id)
  }

  const update = async (project: Partial<Omit<Project, "id">> & { id: string }) => {
    await db.project.update(project.id, omit(project, ["id"]))
  }

  const remove = async (id: string) => {
    await db.project.delete(id)
  }

  return {
    projects,

    save,
    saveFromCloud,
    update,
    remove,
    getById,
  }
}

export async function remapFieldValue(fields: FieldConfig[], feature: ProjectData<ProjectDataFeature>) {
  const db = useDb()

  const data = feature.data.data
  const mapped: Record<string, string | number | boolean | Record<string, any>> = {
    id: feature.id,
    geom: (feature.data as ProjectDataFeature).geom,
  }
  for (const field of fields) {
    if (data[field.key] == null) {
      mapped[field.name] = ""
      continue
    }

    mapped[field.name] = await match(field)
      .returnType<Promise<string | number | boolean>>()
      .with({ type: FieldType.IMAGE }, async (f) => {
        return (await db.image.get(data[f.key]))?.image ?? ""
      })
      .with({ type: FieldType.CHECKBOX }, async (f: FieldConfigCheckbox) => {
        const value = data[f.key]
        if (typeof value === "string") {
          return f.fieldConfig!.options.find((opt) => opt.key === value)?.value ?? ""
        }

        return value.map((v) => f.fieldConfig!.options.find((opt) => opt.key === v)?.value ?? "")
      })
      .otherwise(async () => data[field.key])
  }

  return mapped
}
