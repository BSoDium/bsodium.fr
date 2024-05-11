import {
  CssBaseline, CssVarsProvider, extendTheme,
  useColorScheme,
  useTheme,
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

function Meta() {
  const { colorScheme } = useColorScheme();
  const { palette } = useTheme();

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = colorScheme === 'dark' ? palette.common.black : palette.common.white;
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [colorScheme]);

  return null;
}

export default function FixedMode({
  children,
  mode = 'system',
  root = true,
  className,
  style,
}: {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'system';
  root?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
      <Meta />
      <div data-joy-color-scheme={mode !== 'system' ? mode : undefined} className={className} style={style}>
        {children}
      </div>
    </CssVarsProvider>
  );
}
