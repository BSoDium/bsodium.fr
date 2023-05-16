import React from 'react';
import ReactDOM from 'react-dom/client';
import App from 'App';
import {
  CssBaseline, CssVarsProvider, StyledEngineProvider, extendTheme,
} from '@mui/joy';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

const appTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        background: {
          body: 'var(--joy-palette-neutral-50)',
        },
      },
    },
    dark: {
      palette: {
        background: {
          body: 'var(--joy-palette-common-black)',
          surface: 'var(--joy-palette-neutral-900)',
        },
      },
    },
  },
});

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <CssVarsProvider
        disableTransitionOnChange
        theme={appTheme}
        defaultMode="system"
        modeStorageKey="app-apperance-mode"
      >
        <CssBaseline />
        <App />
      </CssVarsProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
