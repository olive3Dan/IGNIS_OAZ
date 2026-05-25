import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import type { FeatureResponse } from '../types/feature';
import { searchFeatures } from '../utils/searchFeatures';

interface MapSearchBarProps {
  features: FeatureResponse[];
  onSelect: (feature: FeatureResponse) => void;
  onClear?: () => void;
}

export default function MapSearchBar({ features, onSelect, onClear }: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = searchFeatures(features, query);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (feature: FeatureResponse) => {
    setQuery(feature.name);
    setShowResults(false);
    onSelect(feature);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setShowResults(value.length >= 2);
    if (!value && onClear) {
      onClear();
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        width: 320,
      }}
    >
      <TextField
        size="small"
        placeholder="Pesquisar no mapa..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.length >= 2 && setShowResults(true)}
        fullWidth
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          '& .MuiOutlinedInput-root': { borderRadius: 1 },
        }}
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

      {showResults && (
        <Paper sx={{ mt: 0.5, maxHeight: 300, overflow: 'auto' }} elevation={3}>
          {results.length > 0 ? (
            <List dense disablePadding>
              {results.map((feature) => (
                <ListItemButton key={feature.id} onClick={() => handleSelect(feature)}>
                  <ListItemText
                    primary={feature.name}
                    secondary={feature.featureType}
                    primaryTypographyProps={{ fontSize: '0.85rem' }}
                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum resultado encontrado
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
