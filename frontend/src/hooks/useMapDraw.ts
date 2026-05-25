import { useState, useCallback, useRef } from 'react';
import type { DrawMode } from '../components/DrawToolbar';
import type { GeoJSONGeometry } from '../types/feature';
import type maplibregl from 'maplibre-gl';

export interface DrawState {
  mode: DrawMode;
  points: [number, number][];
  isDrawing: boolean;
}

export function useMapDraw(map: React.RefObject<maplibregl.Map | null>) {
  const [drawState, setDrawState] = useState<DrawState>({
    mode: null,
    points: [],
    isDrawing: false,
  });
  const drawSourceAdded = useRef(false);

  const setMode = useCallback((mode: DrawMode) => {
    setDrawState({ mode, points: [], isDrawing: mode !== null });
    if (map.current) {
      map.current.getCanvas().style.cursor = mode ? 'crosshair' : '';
    }
    // Limpar preview
    updateDrawPreview(map.current, []);
  }, [map]);

  const addPoint = useCallback((lngLat: { lng: number; lat: number }) => {
    setDrawState((prev) => {
      if (!prev.mode) return prev;

      const newPoints: [number, number][] = [...prev.points, [lngLat.lng, lngLat.lat]];

      // Para ponto, finaliza imediatamente
      if (prev.mode === 'point') {
        return { ...prev, points: newPoints, isDrawing: false };
      }

      updateDrawPreview(map.current, newPoints, prev.mode);
      return { ...prev, points: newPoints };
    });
  }, [map]);

  const finishDrawing = useCallback((): GeoJSONGeometry | null => {
    const { mode, points } = drawState;
    if (!mode || points.length === 0) return null;

    let geometry: GeoJSONGeometry | null = null;

    if (mode === 'point' && points.length >= 1) {
      geometry = { type: 'Point', coordinates: [points[0][0], points[0][1], 0] };
    } else if (mode === 'line' && points.length >= 2) {
      geometry = {
        type: 'LineString',
        coordinates: points.map((p) => [p[0], p[1], 0]),
      };
    } else if (mode === 'polygon' && points.length >= 3) {
      const closed = [...points, points[0]];
      geometry = {
        type: 'Polygon',
        coordinates: [closed.map((p) => [p[0], p[1], 0])],
      };
    }

    // Reset
    setDrawState({ mode: null, points: [], isDrawing: false });
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    updateDrawPreview(map.current, []);

    return geometry;
  }, [drawState, map]);

  const cancelDrawing = useCallback(() => {
    setDrawState({ mode: null, points: [], isDrawing: false });
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
    updateDrawPreview(map.current, []);
  }, [map]);

  return {
    drawState,
    setMode,
    addPoint,
    finishDrawing,
    cancelDrawing,
    drawSourceAdded,
  };
}

function updateDrawPreview(
  map: maplibregl.Map | null,
  points: [number, number][],
  mode?: DrawMode
) {
  if (!map) return;

  const sourceId = 'draw-preview';

  // Construir GeoJSON de preview
  const features: GeoJSON.Feature[] = [];

  // Pontos individuais
  points.forEach((p) => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: {},
    });
  });

  // Linha de conexão
  if (points.length >= 2 && (mode === 'line' || mode === 'polygon')) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
      properties: { preview: 'line' },
    });
  }

  // Polígono preview (fechar)
  if (points.length >= 3 && mode === 'polygon') {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
      properties: { preview: 'polygon' },
    });
  }

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  if (map.getSource(sourceId)) {
    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: geojson });

    map.addLayer({
      id: 'draw-preview-fill',
      type: 'fill',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': 'rgba(59, 130, 246, 0.2)' },
    });

    map.addLayer({
      id: 'draw-preview-line',
      type: 'line',
      source: sourceId,
      filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
      paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 2] },
    });

    map.addLayer({
      id: 'draw-preview-points',
      type: 'circle',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}
