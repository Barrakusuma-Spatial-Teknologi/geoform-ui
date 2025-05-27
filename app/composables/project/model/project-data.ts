import type { Geometry } from "geojson"

export interface ProjectData<D extends (string | ProjectDataFeature) = (string | ProjectDataFeature)> {
  id: string
  projectId: string
  data: D
  createdAt: number
  syncAt?: number
  tags?: string[]
  participantLocation?: [number, number]
  version?: number
}

export interface ProjectDataImage {
  id: string
  projectId: string
  projectDataId: string
  image: string
  createdAt: number
  updatedAt: number
  syncAt?: number
}

export interface ProjectDataFeature {
  geom: Geometry
  data: Record<string, any>
  tags?: string[]
}
