import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Box from '@mui/material/Box';
import type { BaseMapStyle, FeatureResponse, GeoJSONGeometry } from '../types/feature';
import type { DrawMode } from './DrawToolbar';
import DrawToolbar from './DrawToolbar';
import MapSearchBar from './MapSearchBar';
import BaseMapSelector from './BaseMapSelector';
import CompassIcon from './CompassIcon';

// Bounding box dos 4 concelhos: Oliveira de Azeméis, Vale de Cambra, Arouca, Castelo de Paiva
const CONCELHOS_BOUNDS: [number, number, number, number] = [-9.20, 40.15, -7.45, 41.65];

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; Esri',
    },
  },
  layers: [{ id: 'satellite-layer', type: 'raster', source: 'esri-satellite' }],
};

const TOPO_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'opentopomap': {
      type: 'raster',
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
      attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    },
  },
  layers: [{ id: 'topo-layer', type: 'raster', source: 'opentopomap' }],
};

const BASE_MAPS = [
  { id: 'streets' as BaseMapStyle, name: 'Ruas', url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json' },
  { id: 'satellite' as BaseMapStyle, name: 'Satélite', url: '' },
  { id: 'terrain' as BaseMapStyle, name: 'Terreno', url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' },
  { id: 'topo' as BaseMapStyle, name: 'Topográfico', url: '' },
];

const LAYER_COLORS = {
  polygon: { fill: 'rgba(255, 107, 53, 0.3)', stroke: '#FF6B35' },
  line: { stroke: '#3B82F6' },
};

// SVG pin marker for point features (light green)
const PIN_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
  <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#4CAF50" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="5" fill="#ffffff" opacity="0.9"/>
</svg>
`;

interface MapViewProps {
  features?: FeatureResponse[];
  onFeatureClick?: (feature: FeatureResponse) => void;
  onDeselect?: () => void;
  drawMode: DrawMode;
  onDrawMode: (mode: DrawMode) => void;
  onDrawComplete?: (geometry: GeoJSONGeometry) => void;
  selectedFeatureId?: string;
  flyTo?: { lng: number; lat: number } | null;
  editingGeometry?: boolean;
  editFeature?: FeatureResponse | null;
  onGeometryUpdate?: (geom: GeoJSONGeometry) => void;
}

export default function MapView({ features = [], onFeatureClick, onDeselect, drawMode, onDrawMode, onDrawComplete, selectedFeatureId, flyTo, editingGeometry, editFeature, onGeometryUpdate }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapStyle>('streets');
  const [mapReady, setMapReady] = useState(false);
  const [bearing, setBearing] = useState(0);
  const drawPoints = useRef<[number, number][]>([]);
  const drawModeRef = useRef<DrawMode>(null);
  const onDrawCompleteRef = useRef(onDrawComplete);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onDeselectRef = useRef(onDeselect);
  const featuresRef = useRef(features);
  const editMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onGeometryUpdateRef = useRef(onGeometryUpdate);

  // Keep refs in sync
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { onDrawCompleteRef.current = onDrawComplete; }, [onDrawComplete]);
  useEffect(() => { onFeatureClickRef.current = onFeatureClick; }, [onFeatureClick]);
  useEffect(() => { onDeselectRef.current = onDeselect; }, [onDeselect]);
  useEffect(() => { onGeometryUpdateRef.current = onGeometryUpdate; }, [onGeometryUpdate]);
  useEffect(() => { featuresRef.current = features; }, [features]);

  // Geometry editing: show draggable markers on vertices + live line preview + midpoint markers
  useEffect(() => {
    // Clean up existing markers and edit layer
    editMarkersRef.current.forEach((m) => m.remove());
    editMarkersRef.current = [];

    if (!map.current) return;
    const m = map.current;

    // Remove edit preview layers/source
    if (m.getLayer('edit-preview-line')) m.removeLayer('edit-preview-line');
    if (m.getLayer('edit-preview-fill')) m.removeLayer('edit-preview-fill');
    if (m.getSource('edit-preview')) m.removeSource('edit-preview');

    if (!editingGeometry || !editFeature) return;

    const geom = editFeature.geom;
    if (geom.type === 'Point') {
      // For points, just one draggable marker
      const coord: [number, number] = [geom.coordinates[0], geom.coordinates[1]];
      const el = createVertexElement();
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(coord)
        .addTo(m);

      marker.on('dragend', () => {
        const p = marker.getLngLat();
        const newGeom: GeoJSONGeometry = { type: 'Point', coordinates: [p.lng, p.lat, 0] };
        if (onGeometryUpdateRef.current) onGeometryUpdateRef.current(newGeom);
      });

      editMarkersRef.current.push(marker);
      return () => {
        editMarkersRef.current.forEach((mk) => mk.remove());
        editMarkersRef.current = [];
      };
    }

    // For LineString and Polygon
    let coords: [number, number][] = [];
    if (geom.type === 'LineString') {
      coords = geom.coordinates.map((c) => [c[0], c[1]] as [number, number]);
    } else if (geom.type === 'Polygon') {
      coords = geom.coordinates[0].slice(0, -1).map((c) => [c[0], c[1]] as [number, number]);
    } else {
      return;
    }

    // Add edit preview source and layers for live line rendering
    const editGeoJSON = buildEditGeoJSON(coords, geom.type);
    m.addSource('edit-preview', { type: 'geojson', data: editGeoJSON });
    if (geom.type === 'Polygon') {
      m.addLayer({ id: 'edit-preview-fill', type: 'fill', source: 'edit-preview', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': 'rgba(255, 109, 0, 0.15)' } });
    }
    m.addLayer({ id: 'edit-preview-line', type: 'line', source: 'edit-preview', filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]], paint: { 'line-color': '#FF6D00', 'line-width': 3, 'line-dasharray': [2, 1] } });

    function updateEditPreview(updatedCoords: [number, number][]) {
      const src = m.getSource('edit-preview') as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(buildEditGeoJSON(updatedCoords, geom.type));
      }
    }

    function rebuildMarkers(currentCoords: [number, number][]) {
      // Remove all existing markers
      editMarkersRef.current.forEach((mk) => mk.remove());
      editMarkersRef.current = [];

      // Vertex markers
      currentCoords.forEach((coord, idx) => {
        const el = createVertexElement();
        const marker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(coord)
          .addTo(m);

        marker.on('drag', () => {
          const p = marker.getLngLat();
          currentCoords[idx] = [p.lng, p.lat];
          updateEditPreview(currentCoords);
        });

        marker.on('dragend', () => {
          const p = marker.getLngLat();
          currentCoords[idx] = [p.lng, p.lat];
          updateEditPreview(currentCoords);
          emitGeometry(currentCoords);
        });

        editMarkersRef.current.push(marker);
      });

      // Midpoint markers (for adding new vertices)
      const segmentCount = geom.type === 'Polygon' ? currentCoords.length : currentCoords.length - 1;
      for (let i = 0; i < segmentCount; i++) {
        const a = currentCoords[i];
        const b = currentCoords[(i + 1) % currentCoords.length];
        const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

        const el = createMidpointElement();
        const midMarker = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(mid)
          .addTo(m);

        const insertIdx = i + 1;
        midMarker.on('dragend', () => {
          const p = midMarker.getLngLat();
          // Insert new vertex at this position
          currentCoords.splice(insertIdx, 0, [p.lng, p.lat]);
          updateEditPreview(currentCoords);
          emitGeometry(currentCoords);
          // Rebuild all markers with new coords
          rebuildMarkers(currentCoords);
        });

        editMarkersRef.current.push(midMarker);
      }
    }

    function emitGeometry(updatedCoords: [number, number][]) {
      let newGeom: GeoJSONGeometry;
      if (geom.type === 'LineString') {
        newGeom = { type: 'LineString', coordinates: updatedCoords.map((c) => [c[0], c[1], 0]) };
      } else {
        const closed = [...updatedCoords, updatedCoords[0]];
        newGeom = { type: 'Polygon', coordinates: [closed.map((c) => [c[0], c[1], 0])] };
      }
      if (onGeometryUpdateRef.current) onGeometryUpdateRef.current(newGeom);
    }

    rebuildMarkers(coords);

    return () => {
      editMarkersRef.current.forEach((mk) => mk.remove());
      editMarkersRef.current = [];
      if (m.getLayer('edit-preview-line')) m.removeLayer('edit-preview-line');
      if (m.getLayer('edit-preview-fill')) m.removeLayer('edit-preview-fill');
      if (m.getSource('edit-preview')) m.removeSource('edit-preview');
    };
  }, [editingGeometry, editFeature]);

  // Update cursor when draw mode changes
  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = drawMode ? 'crosshair' : '';
    if (!drawMode) {
      drawPoints.current = [];
      updateDrawPreview(map.current, [], null);
    }
  }, [drawMode]);

  // Fly to location
  useEffect(() => {
    if (!map.current || !flyTo) return;
    map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 14, duration: 1500 });
  }, [flyTo]);

  // Highlight selected feature
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;
    if (m.getLayer('features-highlight')) {
      m.removeLayer('features-highlight');
    }
    if (selectedFeatureId && m.getSource('features-source')) {
      m.addLayer({
        id: 'features-highlight',
        type: 'line',
        source: 'features-source',
        filter: ['==', ['get', 'id'], selectedFeatureId],
        paint: { 'line-color': '#facc15', 'line-width': 4 },
      });
    }
    // Update point selected layers
    if (m.getLayer('features-point-selected')) {
      m.setFilter('features-point-selected', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], selectedFeatureId || '']]);
    }
    if (m.getLayer('features-point-selected-glow')) {
      m.setFilter('features-point-selected-glow', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], selectedFeatureId || '']]);
    }
  }, [selectedFeatureId, mapReady, features]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: BASE_MAPS[0].url,
      center: [-8.45, 40.87],
      zoom: 11,
      pitch: 45,
      bearing: 0,
      maxBounds: CONCELHOS_BOUNDS,
      maxZoom: 17,
      minZoom: 9,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.current.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'top-right'
    );
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

    // Track bearing
    map.current.on('rotate', () => {
      if (map.current) setBearing(map.current.getBearing());
    });

    // Draw click handler
    map.current.on('click', (e) => {
      const mode = drawModeRef.current;
      if (mode) {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        drawPoints.current.push(point);

        if (mode === 'point') {
          const geometry: GeoJSONGeometry = { type: 'Point', coordinates: [point[0], point[1], 0] };
          drawPoints.current = [];
          updateDrawPreview(map.current!, [], null);
          onDrawCompleteRef.current?.(geometry);
        } else {
          updateDrawPreview(map.current!, drawPoints.current, mode);
        }
        return;
      }

      // Check if click was on a feature layer — if not, deselect
      const m = map.current!;
      const featureLayers = ['features-polygon-fill', 'features-line', 'features-line-hitarea', 'features-point'];
      const existingLayers = featureLayers.filter((id) => m.getLayer(id));
      const clickedFeatures = existingLayers.length > 0 ? m.queryRenderedFeatures(e.point, { layers: existingLayers }) : [];
      if (clickedFeatures.length === 0 && onDeselectRef.current) {
        onDeselectRef.current();
      }
    });

    // Double-click to finish line/polygon
    map.current.on('dblclick', (e) => {
      const mode = drawModeRef.current;
      if (!mode || mode === 'point') return;
      e.preventDefault();

      const points = drawPoints.current;
      let geometry: GeoJSONGeometry | null = null;

      if (mode === 'line' && points.length >= 2) {
        geometry = { type: 'LineString', coordinates: points.map((p) => [p[0], p[1], 0]) };
      } else if (mode === 'polygon' && points.length >= 3) {
        const closed = [...points, points[0]];
        geometry = { type: 'Polygon', coordinates: [closed.map((p) => [p[0], p[1], 0])] };
      }

      drawPoints.current = [];
      updateDrawPreview(map.current!, [], null);

      if (geometry) {
        onDrawCompleteRef.current?.(geometry);
      }
    });

    map.current.on('load', () => {
      addTerrain(map.current!);
      addPinMarkerImage(map.current!);
      addConcelhosLayer(map.current!);
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Convert features to GeoJSON
  const toGeoJSON = useCallback((features: FeatureResponse[]) => ({
    type: 'FeatureCollection' as const,
    features: features.map((f) => ({
      type: 'Feature' as const,
      id: f.id,
      geometry: f.geom,
      properties: { id: f.id, name: f.name, featureType: f.featureType, description: f.description, area_m2: f.area_m2, perimeter_m: f.perimeter_m, length_m: f.length_m },
    })),
  }), []);

  // Update layers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;
    const sourceId = 'features-source';
    const geojson = toGeoJSON(features);

    if (m.getSource(sourceId)) {
      (m.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as never);
    } else {
      m.addSource(sourceId, { type: 'geojson', data: geojson as never });

      m.addLayer({ id: 'features-polygon-fill', type: 'fill', source: sourceId, filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], paint: { 'fill-color': LAYER_COLORS.polygon.fill, 'fill-opacity': 0.6 } });
      m.addLayer({ id: 'features-polygon-outline', type: 'line', source: sourceId, filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], paint: { 'line-color': LAYER_COLORS.polygon.stroke, 'line-width': 2 } });
      m.addLayer({ id: 'features-line', type: 'line', source: sourceId, filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], paint: { 'line-color': LAYER_COLORS.line.stroke, 'line-width': 3 } });

      // Invisible wider line for easier click targeting
      m.addLayer({ id: 'features-line-hitarea', type: 'line', source: sourceId, filter: ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], paint: { 'line-color': 'transparent', 'line-width': 16 } });

      // SVG pin markers for points — default state
      m.addLayer({
        id: 'features-point',
        type: 'symbol',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'icon-image': 'pin-marker',
          'icon-size': 0.9,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-opacity': 0.85,
        },
      });

      // Point hover layer — larger, full opacity
      m.addLayer({
        id: 'features-point-hover',
        type: 'symbol',
        source: sourceId,
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']],
        layout: {
          'icon-image': 'pin-marker',
          'icon-size': 1.2,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-opacity': 1,
        },
      });

      // Point selected layer — largest, full opacity
      m.addLayer({
        id: 'features-point-selected-glow',
        type: 'circle',
        source: sourceId,
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']],
        paint: {
          'circle-radius': 0,
          'circle-color': 'transparent',
          'circle-stroke-width': 0,
          'circle-stroke-color': 'transparent',
        },
      });
      m.addLayer({
        id: 'features-point-selected',
        type: 'symbol',
        source: sourceId,
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']],
        layout: {
          'icon-image': 'pin-marker',
          'icon-size': 1.3,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
        paint: {
          'icon-opacity': 1,
        },
      });

      // Hover highlight layers (initially hidden via filter)
      m.addLayer({
        id: 'features-hover-polygon',
        type: 'line',
        source: sourceId,
        filter: ['all', ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], ['==', ['get', 'id'], '']],
        paint: { 'line-color': '#facc15', 'line-width': 3 },
      });
      m.addLayer({
        id: 'features-hover-line',
        type: 'line',
        source: sourceId,
        filter: ['all', ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], ['==', ['get', 'id'], '']],
        paint: { 'line-color': '#facc15', 'line-width': 5 },
      });
      m.addLayer({
        id: 'features-hover-point',
        type: 'circle',
        source: sourceId,
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']],
        paint: { 'circle-radius': 0, 'circle-color': 'transparent', 'circle-stroke-width': 0, 'circle-stroke-color': 'transparent' },
      });

      // Click handlers — NO popup, just selection
      ['features-polygon-fill', 'features-line', 'features-line-hitarea', 'features-point'].forEach((layerId) => {
        m.on('click', layerId, (e) => {
          if (drawModeRef.current) return; // Ignore clicks when drawing
          if (!e.features?.[0]) return;
          const props = e.features[0].properties;
          if (props?.id) {
            const clicked = featuresRef.current.find((f) => f.id === props.id);
            if (clicked && onFeatureClickRef.current) {
              onFeatureClickRef.current(clicked);
            }
          }
        });
        m.on('mouseenter', layerId, () => {
          if (drawModeRef.current) return;
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', layerId, () => {
          if (drawModeRef.current) return;
          m.getCanvas().style.cursor = '';
        });
      });

      // Hover effect: show border on hovered feature
      ['features-polygon-fill', 'features-line', 'features-line-hitarea', 'features-point'].forEach((layerId) => {
        m.on('mousemove', layerId, (e) => {
          if (drawModeRef.current) return;
          const id = e.features?.[0]?.properties?.id;
          if (!id) return;
          m.setFilter('features-hover-polygon', ['all', ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], ['==', ['get', 'id'], id]]);
          m.setFilter('features-hover-line', ['all', ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], ['==', ['get', 'id'], id]]);
          m.setFilter('features-hover-point', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], id]]);
          m.setFilter('features-point-hover', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], id]]);
        });
        m.on('mouseleave', layerId, () => {
          m.setFilter('features-hover-polygon', ['all', ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]], ['==', ['get', 'id'], '']]);
          m.setFilter('features-hover-line', ['all', ['in', ['geometry-type'], ['literal', ['LineString', 'MultiLineString']]], ['==', ['get', 'id'], '']]);
          m.setFilter('features-hover-point', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']]);
          m.setFilter('features-point-hover', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']]);
        });
      });
    }
  }, [features, mapReady, toGeoJSON]);

  const changeBaseMap = useCallback((style: BaseMapStyle) => {
    const baseMap = BASE_MAPS.find((b) => b.id === style);
    if (baseMap && map.current) {
      const styleValue = style === 'satellite' ? SATELLITE_STYLE : style === 'topo' ? TOPO_STYLE : baseMap.url;
      map.current.setStyle(styleValue);
      setActiveBaseMap(style);
      setMapReady(false);
      map.current.once('style.load', () => {
        addTerrain(map.current!);
        addPinMarkerImage(map.current!);
        addConcelhosLayer(map.current!);
        setMapReady(true);
      });
    }
  }, []);

  const handleResetBearing = useCallback(() => {
    if (map.current) {
      map.current.easeTo({ bearing: 0, duration: 500 });
    }
  }, []);

  const handleSearchSelect = useCallback((feature: FeatureResponse) => {
    if (onFeatureClick) onFeatureClick(feature);
    const geom = feature.geom;
    let center: { lng: number; lat: number } | null = null;
    if (geom.type === 'Point') {
      center = { lng: geom.coordinates[0], lat: geom.coordinates[1] };
    } else if (geom.type === 'LineString') {
      const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
      center = { lng: mid[0], lat: mid[1] };
    } else if (geom.type === 'Polygon') {
      const coords = geom.coordinates[0];
      const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      center = { lng: avgLng, lat: avgLat };
    } else if (geom.type === 'MultiPolygon') {
      const coords = geom.coordinates[0][0];
      const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      center = { lng: avgLng, lat: avgLat };
    }
    if (center && map.current) {
      map.current.flyTo({ center: [center.lng, center.lat], zoom: 14, duration: 1500 });
    }
  }, [onFeatureClick]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} data-testid="map-container" style={{ width: '100%', height: '100%' }} />

      {/* Map search bar */}
      <MapSearchBar features={features} onSelect={handleSearchSelect} />

      {/* Draw toolbar — below search bar */}
      <DrawToolbar onDrawMode={onDrawMode} activeMode={drawMode} />

      {/* Compass */}
      <CompassIcon bearing={bearing} onResetBearing={handleResetBearing} />

      {/* Base map selector */}
      <BaseMapSelector activeBaseMap={activeBaseMap} onChangeBaseMap={changeBaseMap} />

      {/* Draw mode indicator */}
      {drawMode && (
        <Box
          data-testid="draw-indicator"
          sx={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: 2,
            py: 1,
            borderRadius: 2,
            fontSize: '0.8rem',
            boxShadow: 3,
            zIndex: 5,
          }}
        >
          {drawMode === 'point' && 'Clique no mapa para colocar o ponto'}
          {drawMode === 'line' && 'Clique para adicionar pontos. Duplo-clique para terminar.'}
          {drawMode === 'polygon' && 'Clique para adicionar vértices. Duplo-clique para fechar.'}
        </Box>
      )}
    </Box>
  );
}

function addTerrain(map: maplibregl.Map) {
  if (!map.getSource('terrain-dem')) {
    map.addSource('terrain-dem', {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 13,
      bounds: CONCELHOS_BOUNDS,
    });
  }
  map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
}

function addPinMarkerImage(map: maplibregl.Map) {
  if (map.hasImage('pin-marker')) return;

  const img = new Image(24, 36);
  img.onload = () => {
    if (!map.hasImage('pin-marker')) {
      map.addImage('pin-marker', img);
    }
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(PIN_MARKER_SVG);
}

function updateDrawPreview(map: maplibregl.Map, points: [number, number][], mode: DrawMode) {
  const sourceId = 'draw-preview';
  const features: GeoJSON.Feature[] = [];

  points.forEach((p) => {
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} });
  });

  if (points.length >= 2 && (mode === 'line' || mode === 'polygon')) {
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: {} });
  }

  if (points.length >= 3 && mode === 'polygon') {
    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] }, properties: {} });
  }

  const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: geojson });
    map.addLayer({ id: 'draw-preview-fill', type: 'fill', source: sourceId, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': 'rgba(59, 130, 246, 0.2)' } });
    map.addLayer({ id: 'draw-preview-line', type: 'line', source: sourceId, filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]], paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 2] } });
    map.addLayer({ id: 'draw-preview-points', type: 'circle', source: sourceId, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#3b82f6', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
  }
}

function createVertexElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '14px';
  el.style.height = '14px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = '#FF6D00';
  el.style.border = '2px solid white';
  el.style.cursor = 'grab';
  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  return el;
}

function createMidpointElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = '10px';
  el.style.height = '10px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = 'rgba(255, 109, 0, 0.5)';
  el.style.border = '2px solid white';
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
  return el;
}

function buildEditGeoJSON(coords: [number, number][], geomType: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  if (geomType === 'LineString') {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    });
  } else if (geomType === 'Polygon') {
    const closed = [...coords, coords[0]];
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [closed] },
      properties: {},
    });
  }

  return { type: 'FeatureCollection', features };
}

function addConcelhosLayer(map: maplibregl.Map) {
  if (map.getSource('concelhos-source')) return;

  fetch('/concelhos.geojson')
    .then((res) => res.json())
    .then((geojson) => {
      if (map.getSource('concelhos-source')) return;
      map.addSource('concelhos-source', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'concelhos-outline',
        type: 'line',
        source: 'concelhos-source',
        paint: {
          'line-color': '#D32F2F',
          'line-width': 2.5,
          'line-dasharray': [4, 2],
        },
      });
    })
    .catch(() => {
      // Silently fail if concelhos file not available
    });
}
