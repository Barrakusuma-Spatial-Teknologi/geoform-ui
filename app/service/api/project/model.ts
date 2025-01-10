import type { Geometry } from "geojson"

export interface ProjectDataResponse {
  id: string
  geom: Geometry
  data: Record<string, any>
  createdBy: string
}

export interface ProjectDataUpdatePayload extends Omit<ProjectDataResponse, "createdBy"> {}
