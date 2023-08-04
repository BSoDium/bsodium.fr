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
  mode = 'system',
  root = true,
}: {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'system';
  root?: boolean;
}) {
  // Clear the localStorage on first load
  useEffect(() => {
    localStorage.clear();
  }, []);

  // If root, then set the data-joy-color-scheme attribute on the root element
  useEffect(() => {
    if (root && mode !== 'system') {
      document.documentElement.setAttribute(
        'data-joy-color-scheme',
        mode,
      );
    }
  }, [mode, root]);

  return (
    <CssVarsProvider
      theme={appTheme}
      defaultMode={mode === 'system' ? mode : undefined}
    >
      <CssBaseline disableColorScheme />
      <div data-joy-color-scheme={mode !== 'system' ? mode : undefined}>
        {children}
      </div>
    </CssVarsProvider>
  );
}
