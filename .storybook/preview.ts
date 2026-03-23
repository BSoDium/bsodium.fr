import React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import '../app/app.css';

// Apply dark/light theme class + data-theme to the html element so that
// HeroUI CSS variables and Tailwind dark-mode utilities resolve correctly.
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string) || 'dark';

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return React.createElement(Story, null);
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    backgrounds: { disabled: true },
  },
};

export default preview;