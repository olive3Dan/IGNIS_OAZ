import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import PlaceIcon from '@mui/icons-material/Place';
import TimelineIcon from '@mui/icons-material/Timeline';
import PentagonIcon from '@mui/icons-material/Pentagon';

export type DrawMode = 'point' | 'line' | 'polygon' | null;

interface DrawToolbarProps {
  onDrawMode: (mode: DrawMode) => void;
  activeMode: DrawMode;
}

const tools: { mode: NonNullable<DrawMode>; label: string; icon: React.ReactNode }[] = [
  { mode: 'point', label: 'Desenhar ponto', icon: <PlaceIcon /> },
  { mode: 'line', label: 'Desenhar linha', icon: <TimelineIcon /> },
  { mode: 'polygon', label: 'Desenhar polígono', icon: <PentagonIcon /> },
];

export default function DrawToolbar({ onDrawMode, activeMode }: DrawToolbarProps) {
  return (
    <Paper
      data-testid="draw-toolbar"
      elevation={3}
      sx={{
        position: 'absolute',
        top: 12,
        left: 16,
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
      }}
    >
      {tools.map(({ mode, label, icon }) => (
        <IconButton
          key={mode}
          aria-label={label}
          data-active={activeMode === mode ? 'true' : 'false'}
          onClick={() => onDrawMode(activeMode === mode ? null : mode)}
          sx={{
            bgcolor: activeMode === mode ? 'primary.light' : 'transparent',
            color: activeMode === mode ? 'primary.contrastText' : 'text.primary',
            '&:hover': {
              bgcolor: activeMode === mode ? 'primary.main' : 'action.hover',
            },
          }}
        >
          {icon}
        </IconButton>
      ))}
    </Paper>
  );
}
