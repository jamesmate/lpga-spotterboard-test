import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { theme } from './theme/theme';
import { Spotterboard } from './components/Spotterboard';

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Spotterboard />
    </MantineProvider>
  );
}

export default App;
