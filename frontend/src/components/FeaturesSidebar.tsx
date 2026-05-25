import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaceIcon from '@mui/icons-material/Place';
import TimelineIcon from '@mui/icons-material/Timeline';
import PentagonIcon from '@mui/icons-material/Pentagon';
import type { FeatureResponse } from '../types/feature';
import { truncate } from '../utils/truncate';
import { formatDate } from '../utils/formatDate';

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest';

interface FeaturesSidebarProps {
  features: FeatureResponse[];
  selectedFeatureId?: string;
  onSelect: (feature: FeatureResponse) => void;
  onDelete: (id: string) => void;
  onZoom: (feature: FeatureResponse) => void;
}

function getGeometryIcon(featureType: string) {
  const type = featureType.toLowerCase();
  if (type.includes('ponto') || type.includes('point') || type.includes('posto') || type.includes('vigia')) {
    return <PlaceIcon fontSize="small" color="primary" />;
  }
  if (type.includes('trilho') || type.includes('line') || type.includes('curso')) {
    return <TimelineIcon fontSize="small" color="primary" />;
  }
  return <PentagonIcon fontSize="small" color="primary" />;
}

export default function FeaturesSidebar({ features, selectedFeatureId, onSelect, onDelete, onZoom }: FeaturesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; feature: FeatureResponse } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get unique feature types for filter menu
  const featureTypes = useMemo(() => {
    const types = new Set(features.map((f) => f.featureType));
    return Array.from(types).sort();
  }, [features]);

  // Filter and sort features
  const filteredFeatures = useMemo(() => {
    let result = features;

    // Search filter
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }

    // Type filter
    if (filterType) {
      result = result.filter((f) => f.featureType === filterType);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-newest':
          return (b as unknown as { createdAt?: string }).createdAt?.localeCompare((a as unknown as { createdAt?: string }).createdAt || '') || 0;
        case 'date-oldest':
          return (a as unknown as { createdAt?: string }).createdAt?.localeCompare((b as unknown as { createdAt?: string }).createdAt || '') || 0;
        default:
          return 0;
      }
    });

    return result;
  }, [features, searchQuery, filterType, sortBy]);

  const handleContextAction = (action: string) => {
    if (!menuAnchor) return;
    const feature = menuAnchor.feature;
    setMenuAnchor(null);

    switch (action) {
      case 'edit':
        onSelect(feature);
        break;
      case 'delete':
        setDeleteConfirmId(feature.id);
        break;
      case 'zoom':
        onZoom(feature);
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={600}>
          Medições
        </Typography>
      </Box>

      {/* Search and controls */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Pesquisar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => setFilterAnchor(e.currentTarget)}
          color={filterType ? 'primary' : 'default'}
          aria-label="Filtrar"
        >
          <FilterListIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => setSortAnchor(e.currentTarget)}
          aria-label="Ordenar"
        >
          <SortIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Feature list */}
      <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {filteredFeatures.map((feature) => (
          <ListItem
            key={feature.id}
            onClick={() => onSelect(feature)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              cursor: 'pointer',
              border: 1,
              borderColor: selectedFeatureId === feature.id ? 'primary.main' : 'transparent',
              bgcolor: selectedFeatureId === feature.id ? 'action.selected' : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: selectedFeatureId === feature.id ? 'action.selected' : 'action.hover',
                borderColor: 'primary.main',
              },
            }}
            secondaryAction={
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor({ el: e.currentTarget, feature });
                }}
                aria-label="Menu de contexto"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {getGeometryIcon(feature.featureType)}
            </ListItemIcon>
            <ListItemText
              primary={truncate(feature.name, 40)}
              secondary={formatDate((feature as unknown as { createdAt?: string }).createdAt)}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItem>
        ))}
        {filteredFeatures.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma medição encontrada
            </Typography>
          </Box>
        )}
      </List>

      {/* Filter menu */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        <MenuItem
          onClick={() => { setFilterType(null); setFilterAnchor(null); }}
          selected={filterType === null}
        >
          Todos
        </MenuItem>
        {featureTypes.map((type) => (
          <MenuItem
            key={type}
            onClick={() => { setFilterType(type); setFilterAnchor(null); }}
            selected={filterType === type}
          >
            {type}
          </MenuItem>
        ))}
      </Menu>

      {/* Sort menu */}
      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={() => setSortAnchor(null)}
      >
        <MenuItem onClick={() => { setSortBy('name-asc'); setSortAnchor(null); }} selected={sortBy === 'name-asc'}>
          Nome (A-Z)
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('name-desc'); setSortAnchor(null); }} selected={sortBy === 'name-desc'}>
          Nome (Z-A)
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('date-newest'); setSortAnchor(null); }} selected={sortBy === 'date-newest'}>
          Data (mais recente)
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('date-oldest'); setSortAnchor(null); }} selected={sortBy === 'date-oldest'}>
          Data (mais antiga)
        </MenuItem>
      </Menu>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleContextAction('edit')}>Editar</MenuItem>
        <MenuItem onClick={() => handleContextAction('delete')}>Eliminar</MenuItem>
        <MenuItem onClick={() => handleContextAction('zoom')}>Zoom</MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Confirmar eliminação</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem a certeza que deseja eliminar esta medição? Esta ação não pode ser revertida.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
