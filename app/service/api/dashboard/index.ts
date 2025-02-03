import { useMainServiceFetch } from "~/service/api/base"

export interface ProjectSummary {
  projectId: string
  totalData: number
  totalImageSizeMB: number
  totalImage: number
  totalParticipant: number
}

async function getSummary(projectId: string): Promise<ProjectSummary> {
  const res = await useMainServiceFetch<ProjectSummary>(`/projects/${projectId}/summary`, {})
  return res.data
}

export interface ParticipantSummary {
  participantId: string
  projectId: string
  createdBy: string
  count: string
  username: string
}

async function getParticipants(projectId: string) {
  const res = await useMainServiceFetch<ParticipantSummary[]>(`/api/projects/${projectId}/`, {})
  return res.data
}

export interface ProjectH3Summary {
  h3id: string
  count: number
  projectId?: string
}

async function getH3(projectId: string, zoom: number) {
  const res = await useMainServiceFetch<ProjectH3Summary[]>(`/projects/${projectId}/data/h3/${zoom}`)
  return res.data
}

export const ProjectDashboardService = {
  getParticipants,
  getSummary,
  getH3,
}
