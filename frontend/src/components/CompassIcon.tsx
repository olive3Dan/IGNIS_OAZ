import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

interface CompassIconProps {
  bearing: number;
  onResetBearing: () => void;
}

export default function CompassIcon({ bearing, onResetBearing }: CompassIconProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        right: 56,
        borderRadius: '50%',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={onResetBearing}
      title="Repor norte"
    >
      <Box
        component="svg"
        viewBox="0 0 24 24"
        sx={{
          width: 24,
          height: 24,
          transform: `rotate(${-bearing}deg)`,
          transition: bearing === 0 ? 'transform 0.5s ease' : 'none',
        }}
      >
        {/* North pointer (fire orange) */}
        <path
          d="M12 2 L15 12 L12 10 L9 12 Z"
          fill="#FF6D00"
        />
        {/* South pointer (dark green) */}
        <path
          d="M12 22 L9 12 L12 14 L15 12 Z"
          fill="#1B5E20"
        />
        {/* Center dot */}
        <circle cx="12" cy="12" r="1.5" fill="#ffffff" stroke="#333" strokeWidth="0.5" />
      </Box>
    </Paper>
  );
}
