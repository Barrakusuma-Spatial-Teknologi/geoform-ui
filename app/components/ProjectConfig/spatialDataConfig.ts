import type { ProjectLayer } from "~/composables/project/model/project-layer"

export type SpatialDataLayers = Omit<ProjectLayer, "layerOrder" | "createdAt" | "projectId"> & { visible: boolean }
