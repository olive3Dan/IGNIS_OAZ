import { createTheme } from '@mui/material/styles';

const commonPalette = {
  primary: { main: '#1B5E20' },       // IGNIS dark green
  secondary: { main: '#FF6D00' },     // Fire orange
  error: { main: '#D32F2F' },         // Fire red
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...commonPalette,
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 1,
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...commonPalette,
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 1,
      },
    },
  },
});
