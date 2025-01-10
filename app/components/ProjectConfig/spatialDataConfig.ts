import type { ProjectLayer } from "~/composables/project/project-layer"

export type SpatialDataLayers = Omit<ProjectLayer, "layerOrder" | "createdAt" | "projectId"> & { visible: boolean }
