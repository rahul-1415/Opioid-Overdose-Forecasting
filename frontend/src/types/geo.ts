import type { Feature, FeatureCollection, Geometry } from "geojson";

export type FeatureProperties = Record<string, unknown>;

export interface MapFeatureProperties extends FeatureProperties {
  COUNTYFP?: string | number;
  GEOID?: string | number;
  total_dosage?: number;
}

export type MapFeature = Feature<Geometry, MapFeatureProperties>;

export type MapFeatureCollection = FeatureCollection<Geometry, MapFeatureProperties>;
