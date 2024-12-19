import { useStorage } from "@vueuse/core"

export interface Project {
  key: string
  name: string
  lastModified: string
  createdAt: string
  fields: FieldConfig[]
}

export function useProjectStore() {
  const projects = useStorage<Project[]>("project", [])

  function save(project: Project) {
    projects.value.unshift(project)
  }

  function update(project: Project) {
    projects.value.splice(projects.value.indexOf(project), 1)
    projects.value.unshift(project)
  }

  function remove(project: Project) {
    projects.value.splice(projects.value.indexOf(project), 1)
  }

  return {
    projects,
    save,
    update,
    remove,
  }
}

export enum FieldType {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
  DATE = "DATE",
  CHECKBOX = "CHECKBOX",
  IMAGE = "IMAGE",
  BOOLEAN = "BOOLEAN",
}

export const fieldOptions: FieldType[] = [
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.DATE,
  FieldType.CHECKBOX,
  FieldType.IMAGE,
  FieldType.BOOLEAN,
]

export interface FieldConfig {
  key: string
  name: string
  required: boolean
  type: FieldType
  optionConfig?: {
    options: { key: string, value: string }[]
    multiple: boolean
  }
}
