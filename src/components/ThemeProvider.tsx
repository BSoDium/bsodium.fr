import {
  CssBaseline,
  CssVarsProvider, extendTheme,
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
        neutral: {
          solidBg: "var(--joy-palette-neutral-200)",
          solidColor: "var(--joy-palette-neutral-900)",
          solidHoverBg: "var(--joy-palette-neutral-300)",
          solidActiveBg: "var(--joy-palette-neutral-400)",
        },
      },
    },
    light: {
      palette: {
        background: {
          body: 'var(--joy-palette-neutral-50)',
        },
        neutral: {
          solidBg: "var(--joy-palette-neutral-800)",
          solidColor: "var(--joy-palette-neutral-100)",
          solidHoverBg: "var(--joy-palette-neutral-800)",
          solidActiveBg: "var(--joy-palette-neutral-700)",
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

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CssVarsProvider theme={appTheme} defaultMode="system">
      <CssBaseline />
      <Meta />
      {children}
    </CssVarsProvider>
  );
}
