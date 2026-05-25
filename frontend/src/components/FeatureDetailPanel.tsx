import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PlaceIcon from '@mui/icons-material/Place';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import type { FeatureResponse, AttachmentResponse, CategoryResponse, GeoJSONGeometry } from '../types/feature';
import { truncate } from '../utils/truncate';
import { formatFileSize } from '../utils/formatFileSize';
import { centroid } from '../utils/centroid';
import { getAttachmentDownloadUrl } from '../api/attachments';

const DRAWER_WIDTH = 380;
const TOOLBAR_HEIGHT = 64;

function toDMS(decimal: number, isLat: boolean): string {
  const direction = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesDecimal = (abs - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

function formatArea(m2: number): string {
  if (m2 >= 10000) {
    return `${(m2 / 10000).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ha`;
  }
  return `${Math.round(m2).toLocaleString('pt-PT')} m²`;
}

function formatDistance(m: number): string {
  if (m >= 1000) {
    return `${(m / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 2 })} km`;
  }
  return `${Math.round(m).toLocaleString('pt-PT')} m`;
}

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

interface FeatureDetailPanelProps {
  feature: FeatureResponse | null;
  attachments?: AttachmentResponse[];
  categories?: CategoryResponse[];
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; featureType: string; description: string; geom: GeoJSONGeometry }) => void;
  onEditGeometry: () => void;
  editingGeometry: boolean;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onDeleteAttachment?: (attachmentId: string) => Promise<void>;
  uploading?: boolean;
}

export default function FeatureDetailPanel({ feature, attachments = [], categories = [], open, onClose, onSave, onEditGeometry, editingGeometry, onUploadFiles, onDeleteAttachment, uploading = false }: FeatureDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFeatureType, setEditFeatureType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset edit state when feature changes
  useEffect(() => {
    if (feature) {
      setEditName(feature.name);
      setEditDescription(feature.description || '');
      setEditFeatureType(feature.featureType);
    }
    setEditing(false);
  }, [feature?.id]);

  if (!feature) return null;

  const coords = centroid(feature.geom);
  const photos = attachments.filter((a) => a.mimeType.startsWith('image/'));
  const files = attachments.filter((a) => !a.mimeType.startsWith('image/'));

  const handleStartEdit = () => {
    setEditName(feature.name);
    setEditDescription(feature.description || '');
    setEditFeatureType(feature.featureType);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(feature.name);
    setEditDescription(feature.description || '');
    setEditFeatureType(feature.featureType);
  };

  const handleSave = () => {
    onSave({
      name: editName,
      featureType: editFeatureType,
      description: editDescription,
      geom: feature.geom,
    });
    setEditing(false);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      sx={{
        width: open ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: TOOLBAR_HEIGHT,
          height: `calc(100% - ${TOOLBAR_HEIGHT}px)`,
        },
      }}
    >
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            {editing ? (
              <TextField
                size="small"
                fullWidth
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                label="Nome"
                autoFocus
              />
            ) : (
              <Typography variant="h6" fontWeight={600}>
                {truncate(feature.name, 120)}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {!editing && (
              <IconButton size="small" onClick={handleStartEdit} aria-label="Editar" color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={onClose} aria-label="Fechar painel">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Edit mode fields */}
          {editing && (
            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                value={editFeatureType}
                onChange={(e) => setEditFeatureType(e.target.value)}
                label="Tipo"
              />
              <TextField
                size="small"
                fullWidth
                multiline
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                label="Descrição"
              />
              {/* Edit geometry button */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditLocationAltIcon />}
                onClick={onEditGeometry}
                color={editingGeometry ? 'secondary' : 'primary'}
              >
                {editingGeometry ? 'A editar geometria...' : 'Editar geometria'}
              </Button>
              {/* Save / Cancel */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="contained" size="small" onClick={handleSave} fullWidth>
                  Guardar
                </Button>
                <Button variant="outlined" size="small" onClick={handleCancelEdit} fullWidth>
                  Cancelar
                </Button>
              </Box>
            </Box>
          )}

          {/* Description (view mode) */}
          {!editing && feature.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {feature.description}
            </Typography>
          )}

          {/* Type badge */}
          {!editing && (
            <Chip label={feature.featureType} size="small" color="primary" variant="outlined" sx={{ mb: 2 }} />
          )}

          {/* Coordinates */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlaceIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                {toDMS(coords[1], true)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlaceIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                {toDMS(coords[0], false)}
              </Typography>
            </Box>
          </Box>

          {/* Metrics — inline, no boxes */}
          {(feature.area_m2 || feature.length_m || feature.elevation_max_m) && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {feature.area_m2 && (
                <Typography variant="body2" color="text.secondary">
                  Área: <strong>{formatArea(feature.area_m2)}</strong>
                </Typography>
              )}
              {feature.perimeter_m && (
                <Typography variant="body2" color="text.secondary">
                  Perímetro: <strong>{formatDistance(feature.perimeter_m)}</strong>
                </Typography>
              )}
              {feature.length_m && (
                <Typography variant="body2" color="text.secondary">
                  Comprimento: <strong>{formatDistance(feature.length_m)}</strong>
                </Typography>
              )}
              {feature.elevation_max_m && (
                <Typography variant="body2" color="text.secondary">
                  Elevação: <strong>{Math.round(feature.elevation_min_m || 0)}–{Math.round(feature.elevation_max_m)} m</strong>
                </Typography>
              )}
            </Box>
          )}

          {/* Last modified date */}
          {(feature as unknown as { updatedAt?: string }).updatedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Última alteração: {formatDateTime((feature as unknown as { updatedAt?: string }).updatedAt)}
            </Typography>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  size="small"
                  sx={cat.color ? { bgcolor: cat.color, color: 'white' } : undefined}
                />
              ))}
            </Box>
          )}

          {/* Properties — simple list, no boxes */}
          {feature.properties && Object.keys(feature.properties).length > 0 && (
            <Box sx={{ mb: 2 }}>
              {Object.entries(feature.properties).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{key}</Typography>
                  <Typography variant="body2" fontWeight={500}>{String(value)}</Typography>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Photos */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Fotos
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
                aria-label="Adicionar fotos"
                disabled={uploading}
              >
                <AddPhotoAlternateIcon fontSize="small" />
              </IconButton>
            </Box>
            {uploading && <LinearProgress sx={{ mb: 1 }} />}
            {photos.length > 0 ? (
              <ImageList cols={3} gap={6} sx={{ mt: 0 }}>
                {photos.map((photo) => (
                  <ImageListItem key={photo.id} sx={{ position: 'relative', width: 100, height: 100 }}>
                    <img
                      src={getAttachmentDownloadUrl(photo.id)}
                      alt={photo.fileName}
                      loading="lazy"
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(getAttachmentDownloadUrl(photo.id), '_blank')}
                    />
                    {onDeleteAttachment && (
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(211,47,47,0.8)' },
                          width: 20,
                          height: 20,
                        }}
                        onClick={() => onDeleteAttachment(photo.id)}
                        aria-label={`Eliminar ${photo.fileName}`}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    )}
                  </ImageListItem>
                ))}
              </ImageList>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Sem fotos
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Attachments */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Anexos
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = '*/*';
                    fileInputRef.current.click();
                  }
                }}
                aria-label="Adicionar anexos"
                disabled={uploading}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Box>
            {files.length > 0 ? (
              <List dense disablePadding>
                {files.map((file) => (
                  <ListItem
                    key={file.id}
                    disablePadding
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          edge="end"
                          size="small"
                          component="a"
                          href={getAttachmentDownloadUrl(file.id)}
                          target="_blank"
                          aria-label={`Descarregar ${file.fileName}`}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        {onDeleteAttachment && (
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => onDeleteAttachment(file.id)}
                            aria-label={`Eliminar ${file.fileName}`}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={file.fileName}
                      secondary={formatFileSize(file.fileSizeBytes)}
                      primaryTypographyProps={{ fontSize: '0.8rem' }}
                      secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Sem anexos
              </Typography>
            )}
          </Box>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const selectedFiles = e.target.files;
              if (selectedFiles && selectedFiles.length > 0 && onUploadFiles) {
                onUploadFiles(Array.from(selectedFiles));
              }
              // Reset input so the same file can be selected again
              e.target.value = '';
            }}
          />
        </Box>
      </Box>
    </Drawer>
  );
}
