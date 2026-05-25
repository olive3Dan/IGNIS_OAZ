import type { GeoJSONGeometry } from '../types/feature';

/**
 * Calculates the centroid of a GeoJSON geometry.
 * Returns [longitude, latitude].
 */
export function centroid(geom: GeoJSONGeometry): [number, number] {
  switch (geom.type) {
    case 'Point':
      return [geom.coordinates[0], geom.coordinates[1]];

    case 'LineString': {
      const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
      return [mid[0], mid[1]];
    }

    case 'Polygon': {
      const ring = geom.coordinates[0];
      const avgLng = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
      const avgLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
      return [avgLng, avgLat];
    }

    case 'MultiLineString': {
      // Use the midpoint of the first line
      const line = geom.coordinates[0];
      const midPt = line[Math.floor(line.length / 2)];
      return [midPt[0], midPt[1]];
    }

    case 'MultiPolygon': {
      // Use the centroid of the first polygon's exterior ring
      const ring2 = geom.coordinates[0][0];
      const avgLng2 = ring2.reduce((sum, c) => sum + c[0], 0) / ring2.length;
      const avgLat2 = ring2.reduce((sum, c) => sum + c[1], 0) / ring2.length;
      return [avgLng2, avgLat2];
    }
  }
}
