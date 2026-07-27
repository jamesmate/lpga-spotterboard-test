import { CssBaseline } from '@mui/material';
import { AppThemeProvider } from './ui/kit';
import { theme } from './theme/theme';
import { Spotterboard } from './components/Spotterboard';

function App() {
  return (
    <AppThemeProvider theme={theme}>
      <CssBaseline />
      <Spotterboard />
    </AppThemeProvider>
  );
}

export default App;
