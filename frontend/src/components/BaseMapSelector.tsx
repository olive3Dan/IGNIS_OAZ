import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LayersIcon from '@mui/icons-material/Layers';
import type { BaseMapStyle } from '../types/feature';

interface BaseMapOption {
  id: BaseMapStyle;
  name: string;
  thumbnail: string;
}

const BASE_MAP_OPTIONS: BaseMapOption[] = [
  { id: 'streets', name: 'Ruas', thumbnail: 'https://a.basemaps.cartocdn.com/light_all/7/63/47.png' },
  { id: 'satellite', name: 'Satélite', thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/47/63' },
  { id: 'terrain', name: 'Terreno', thumbnail: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/7/63/47.png' },
  { id: 'topo', name: 'Topográfico', thumbnail: 'https://tile.opentopomap.org/7/63/47.png' },
];

interface BaseMapSelectorProps {
  activeBaseMap: BaseMapStyle;
  onChangeBaseMap: (style: BaseMapStyle) => void;
}

export default function BaseMapSelector({ activeBaseMap, onChangeBaseMap }: BaseMapSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleSelect = (style: BaseMapStyle) => {
    onChangeBaseMap(style);
    setAnchorEl(null);
  };

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          bottom: 32,
          right: 16,
          borderRadius: 2,
        }}
      >
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Selecionar mapa base"
          sx={{ color: 'text.primary' }}
        >
          <LayersIcon />
        </IconButton>
      </Paper>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, width: 220 }}>
          {BASE_MAP_OPTIONS.map((option) => (
            <Box
              key={option.id}
              onClick={() => handleSelect(option.id)}
              sx={{
                cursor: 'pointer',
                borderRadius: 1,
                overflow: 'hidden',
                border: 2,
                borderColor: activeBaseMap === option.id ? 'primary.main' : 'transparent',
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: activeBaseMap === option.id ? 'primary.main' : 'action.hover' },
              }}
            >
              <Box
                component="img"
                src={option.thumbnail}
                alt={option.name}
                sx={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', textAlign: 'center', py: 0.5, fontWeight: activeBaseMap === option.id ? 600 : 400 }}
              >
                {option.name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
