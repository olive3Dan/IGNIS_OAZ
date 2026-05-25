import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ThemeMode } from '../hooks/useThemeMode';
import { useAuth } from '../contexts/AuthContext';

interface NavigationBarProps {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

function getInitials(name: string | undefined | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function NavigationBar({ themeMode, onToggleTheme }: NavigationBarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
      elevation={0}
    >
      <Toolbar sx={{ height: 64, minHeight: 64 }}>
        {/* Logo */}
        <Box
          component="img"
          src="/logo.png"
          alt="IGNIS"
          sx={{ height: 140, cursor: 'pointer', ml: 0, mt: 2 }}
          onClick={() => navigate('/')}
        />

        {/* Center menu items */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          <Button color="inherit">Mapa</Button>
          <Button color="inherit">Relatórios</Button>
          <Button color="inherit">Configurações</Button>
        </Box>

        {/* Right side controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="inherit" aria-label="Notificações">
            <Badge badgeContent={3} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={onToggleTheme} aria-label="Alternar tema">
            {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {isAuthenticated ? (
            <>
              <IconButton onClick={handleAvatarClick} sx={{ p: 0, ml: 1 }}>
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.875rem' }}
                >
                  {getInitials(user?.name)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2">{user?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Terminar sessão
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/login')}
              sx={{ ml: 1 }}
            >
              Entrar
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
