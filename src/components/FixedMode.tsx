import {
  CssBaseline, CssVarsProvider, extendTheme,
} from '@mui/joy';
import React, { useEffect } from 'react';

export const appTheme = extendTheme({
  colorSchemes: {
    dark: {
      palette: {
        background: {
          body: 'var(--joy-palette-common-black)',
          surface: 'var(--joy-palette-neutral-900)',
        },
      },
    },
    light: {
      palette: {
        background: {
          body: 'var(--joy-palette-neutral-50)',
        },
      },
    },
  },
  components: {
    JoyChip: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === 'outlined' && {
            border: `1px solid var(--joy-palette-${ownerState.color}-600)`,
          }),
        }),
      },
    },

  },
});

export default function FixedMode({
  children,
  mode = 'dark',
}: {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'system';
}) {
  // Clear the localStorage on first load
  useEffect(() => {
    localStorage.clear();
  }, []);

  return (
    <CssVarsProvider
      theme={appTheme}
      defaultMode={mode}
    >
      <CssBaseline />
      {children}
    </CssVarsProvider>
  );
}
