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
    dark: {
      palette: {
        background: {
          body: 'var(--joy-palette-common-black)',
          surface: 'var(--joy-palette-neutral-900)',
        },
      },
    },
  },
  components: {
    JoyChip: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === 'outlined' && {
            border: `1px solid var(--joy-palette-${ownerState.color}-300)`,
          }),
        }),
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
        defaultMode="dark"
      >
        <CssBaseline disableColorScheme />
        <App />
      </CssVarsProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
