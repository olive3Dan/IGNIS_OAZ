import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import MapView from './components/Map';
import NavigationBar from './components/NavigationBar';
import FeaturesSidebar from './components/FeaturesSidebar';
import FeatureDetailPanel from './components/FeatureDetailPanel';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import type { DrawMode } from './components/DrawToolbar';
import type { ThemeMode } from './hooks/useThemeMode';
import { useFeatures } from './hooks/useFeatures';
import { createFeature, updateFeature, deleteFeature } from './api/features';
import { fetchAttachments, uploadAttachment, deleteAttachment } from './api/attachments';
import type { FeatureResponse, AttachmentResponse, GeoJSONGeometry } from './types/feature';

const NAVBAR_HEIGHT = 64;

interface AppProps {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

function MainContent({ themeMode, onToggleTheme }: AppProps) {
  const { features, loading, error, reload } = useFeatures();
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureResponse | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [editingGeometry, setEditingGeometry] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lng: number; lat: number } | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (selectedFeature) {
      fetchAttachments(selectedFeature.id)
        .then(setAttachments)
        .catch(() => setAttachments([]));
    } else {
      setAttachments([]);
    }
  }, [selectedFeature?.id]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!selectedFeature) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadAttachment(selectedFeature.id, file);
      }
      const updated = await fetchAttachments(selectedFeature.id);
      setAttachments(updated);
      setSnackbar({ message: `${files.length} ficheiro(s) carregado(s)`, severity: 'success' });
    } catch (e) {
      setSnackbar({ message: 'Erro ao carregar ficheiro: ' + (e instanceof Error ? e.message : 'Erro'), severity: 'error' });
    } finally {
      setUploading(false);
    }
  }, [selectedFeature]);

  const handleDeleteAttachment = useCallback(async (attachmentId: string) => {
    if (!selectedFeature) return;
    try {
      await deleteAttachment(selectedFeature.id, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      setSnackbar({ message: 'Anexo eliminado', severity: 'success' });
    } catch (e) {
      setSnackbar({ message: 'Erro ao eliminar anexo: ' + (e instanceof Error ? e.message : 'Erro'), severity: 'error' });
    }
  }, [selectedFeature]);

  const handleFeatureClick = useCallback((feature: FeatureResponse) => {
    if (drawMode) return;
    setSelectedFeature(feature);
    setDetailPanelOpen(true);
    setEditingGeometry(false);
  }, [drawMode]);

  const handleFeatureSelect = useCallback((feature: FeatureResponse) => {
    setSelectedFeature(feature);
    setDetailPanelOpen(true);
    setEditingGeometry(false);
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
    if (center) setFlyTo(center);
  }, []);

  const handleZoomToFeature = useCallback((feature: FeatureResponse) => {
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
    if (center) setFlyTo(center);
  }, []);

  const handleDrawComplete = useCallback(async (geometry: GeoJSONGeometry) => {
    setDrawMode(null);
    try {
      const created = await createFeature({ name: 'Sem título', featureType: geometry.type, geom: geometry });
      await reload();
      setSelectedFeature(created);
      setDetailPanelOpen(true);
      setSnackbar({ message: 'Medição criada', severity: 'success' });
    } catch (e) {
      setSnackbar({ message: 'Erro ao criar: ' + (e instanceof Error ? e.message : 'Erro'), severity: 'error' });
    }
  }, [reload]);

  const handleSaveFeature = useCallback(async (data: { name: string; featureType: string; description: string; geom: GeoJSONGeometry }) => {
    if (!selectedFeature) return;
    try {
      const updated = await updateFeature(selectedFeature.id, {
        name: data.name,
        featureType: data.featureType,
        description: data.description || undefined,
        geom: data.geom,
      });
      setSelectedFeature(updated);
      setEditingGeometry(false);
      reload();
      setSnackbar({ message: 'Medição atualizada', severity: 'success' });
    } catch (e) {
      setSnackbar({ message: 'Erro ao atualizar: ' + (e instanceof Error ? e.message : 'Erro'), severity: 'error' });
    }
  }, [selectedFeature, reload]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteFeature(id);
      if (selectedFeature?.id === id) {
        setSelectedFeature(null);
        setDetailPanelOpen(false);
      }
      reload();
      setSnackbar({ message: 'Medição eliminada', severity: 'success' });
    } catch (e) {
      setSnackbar({ message: 'Erro ao eliminar: ' + (e instanceof Error ? e.message : 'Erro'), severity: 'error' });
    }
  }, [selectedFeature, reload]);

  const handleCloseDetail = useCallback(() => {
    setDetailPanelOpen(false);
    setSelectedFeature(null);
    setEditingGeometry(false);
  }, []);

  const handleMapDeselect = useCallback(() => {
    if (selectedFeature && !editingGeometry) {
      setDetailPanelOpen(false);
      setSelectedFeature(null);
    }
  }, [selectedFeature, editingGeometry]);

  const handleStartEditGeometry = useCallback(() => {
    setEditingGeometry(true);
  }, []);

  const handleGeometryUpdate = useCallback((newGeom: GeoJSONGeometry) => {
    if (selectedFeature) {
      setSelectedFeature({ ...selectedFeature, geom: newGeom });
    }
  }, [selectedFeature]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <NavigationBar themeMode={themeMode} onToggleTheme={onToggleTheme} />

      <Box sx={{ display: 'flex', flex: 1, mt: `${NAVBAR_HEIGHT}px`, overflow: 'hidden' }}>
        <FeaturesSidebar
          features={features}
          selectedFeatureId={selectedFeature?.id}
          onSelect={handleFeatureSelect}
          onDelete={handleDelete}
          onZoom={handleZoomToFeature}
        />

        <Box sx={{ flex: 1, position: 'relative' }}>
          <MapView
            features={features}
            onFeatureClick={handleFeatureClick}
            onDeselect={handleMapDeselect}
            drawMode={drawMode}
            onDrawMode={setDrawMode}
            onDrawComplete={handleDrawComplete}
            selectedFeatureId={selectedFeature?.id}
            flyTo={flyTo}
            editingGeometry={editingGeometry}
            editFeature={editingGeometry ? selectedFeature : null}
            onGeometryUpdate={handleGeometryUpdate}
          />
        </Box>

        <FeatureDetailPanel
          feature={selectedFeature}
          attachments={attachments}
          open={detailPanelOpen}
          onClose={handleCloseDetail}
          onSave={handleSaveFeature}
          onEditGeometry={handleStartEditGeometry}
          editingGeometry={editingGeometry}
          onUploadFiles={handleUploadFiles}
          onDeleteAttachment={handleDeleteAttachment}
          uploading={uploading}
        />
      </Box>

      <Snackbar open={loading} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info" variant="filled">A carregar...</Alert>
      </Snackbar>

      <Snackbar open={Boolean(error)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled">Erro: {error}</Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

export default function App({ themeMode, onToggleTheme }: AppProps) {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainContent themeMode={themeMode} onToggleTheme={onToggleTheme} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
