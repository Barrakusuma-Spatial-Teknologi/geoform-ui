import type { Geometry } from "geojson"

export interface ProjectData<D extends (string | ProjectDataFeature) = (string | ProjectDataFeature)> {
  id: string
  projectId: string
  data: D
  createdAt: number
  syncAt?: number
  participantLocation?: [number, number]
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
}
