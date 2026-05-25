// Types derivados do OpenAPI spec (backend)
export interface FeatureRequest {
  name: string;
  featureType: string;
  description?: string;
  geom: GeoJSONGeometry;
  properties?: Record<string, unknown>;
}

export interface FeatureResponse {
  id: string;
  name: string;
  featureType: string;
  description?: string;
  geom: GeoJSONGeometry;
  area_m2?: number;
  perimeter_m?: number;
  length_m?: number;
  elevation_min_m?: number;
  elevation_max_m?: number;
  elevation_avg_m?: number;
  properties?: Record<string, unknown>;
}

export interface AttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

// GeoJSON types
export type GeoJSONGeometry =
  | GeoJSONPoint
  | GeoJSONLineString
  | GeoJSONPolygon
  | GeoJSONMultiLineString
  | GeoJSONMultiPolygon;

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number, number?];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number, number?][];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number, number?][][];
}

export interface GeoJSONMultiLineString {
  type: 'MultiLineString';
  coordinates: [number, number, number?][][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number, number?][][][];
}

// MapLibre base map options
export type BaseMapStyle = 'streets' | 'satellite' | 'terrain' | 'topo';

export interface BaseMapOption {
  id: BaseMapStyle;
  name: string;
  url: string;
}
