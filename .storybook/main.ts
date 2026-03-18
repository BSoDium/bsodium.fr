import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    "../app/**/*.mdx",
    "../app/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs"
  ],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    // react-router's Vite plugin expects a full React Router build context
    // and is incompatible with Storybook's dev server — remove it here.
    config.plugins = (config.plugins ?? []).filter(
      (p) => !(p && typeof p === 'object' && 'name' in p &&
        String((p as { name: unknown }).name).includes('react-router'))
    );
    return config;
  },
};
export default config;