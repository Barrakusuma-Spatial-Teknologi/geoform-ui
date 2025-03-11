import type { FeatureCollection } from "geojson"

export interface ProjectLayer {
  id: string
  layerName: string
  layerOrder: number
  layerStyle?: LayerStyle
  layerData?: LayerData
  projectId: string
  createdAt: number // ISO Date string
}

export interface ProjectLayerNewPayload {
  layerName: string
  layerOrder: number
  layerStyle?: LayerStyle
  layerData?: LayerData
}

export enum LayerDataType {
  XYZRASTER = "XYZRASTER",
  XYZVECTOR = "XYZVECTOR",
  GEOJSON = "GEOJSON",
}

interface LayerDataBase<T extends LayerDataType> {
  type: T
}

// Enums for LayerData
export type LayerData =
  | LayerDataXYZRaster
  | LayerDataXYZVector
  | LayerDataGeoJSON

export interface LayerDataXYZRaster extends LayerDataBase<LayerDataType.XYZRASTER> {
  tileUrl: string
  tileSize?: number
}

export interface LayerDataXYZVector extends LayerDataBase<LayerDataType.XYZVECTOR> {
  tileUrl: string
}

export interface LayerDataGeoJSON extends LayerDataBase<LayerDataType.GEOJSON> {
  data: FeatureCollection
  validation?: LayerValidationConfig
}

export enum LayerStyleType {
  RASTER = "RASTER",
  LINE = "LINE",
  POLYGON = "POLYGON",
  POINT = "POINT",
}

// Enums for LayerStyle
export type LayerStyle =
  | LayerStyleRaster
  | LayerStyleLine
  | LayerStylePolygon
  | LayerStylePoint

interface LayerStyleBase<T extends LayerStyleType> {
  type: T
}

export interface LayerStyleRaster extends LayerStyleBase<LayerStyleType.RASTER> {
  opacity: number
}

export interface LayerStyleLine extends LayerStyleBase<LayerStyleType.LINE> {
  lineColor: string
  lineWidth: number
}

export interface LayerStylePolygon extends LayerStyleBase<LayerStyleType.POLYGON> {
  lineColor: string
  lineWidth: number
  fillColor: string
  labelField?: string[]
}

export interface LayerStylePoint extends LayerStyleBase<LayerStyleType.POINT> {
  pointColor?: string
  pointImage?: string
  labelField?: string[]
}

export interface LayerValidationConfig {
  mode: "off" | "forbidden" | "inside"
}
