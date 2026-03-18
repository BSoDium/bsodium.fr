/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import mkcert from "vite-plugin-mkcert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

/**
 * The directory name of the current module. This is used to construct the path to the Storybook config directory, which is needed for the storybookTest plugin to find the stories defined in the Storybook config. In CommonJS, __dirname is available by default, but in ES modules, we need to use fileURLToPath and path.dirname to get the directory name. See: https://nodejs.org/api/esm.html#esm_filename_and_dirname
 */
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/**
 * Whether this Vite config is being evaluated for Storybook.
 *
 * This is true only when the `STORYBOOK` environment variable is set to `"true"`.
 * It is used to conditionally exclude the React Router Vite plugin, which is
 * incompatible with Storybook's dep pre-bundling step.
 */
const isStorybook = process.env.STORYBOOK === "true";

/**
 * Whether the Vite config is being run in development mode. This is used to conditionally
 * include the mkcert plugin, which is only needed in development mode to generate a local SSL certificate for the dev server. In production mode, the dev server is not used and the mkcert plugin is not needed.
 */
const isDev = process.env.NODE_ENV === "development";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  server: {
    host: "catalyst.localhost",
    port: 5173,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    ...(isStorybook ? [] : [reactRouter()]),
    ...(isDev ? [mkcert({ hosts: ["catalyst.localhost"] })] : []),
  ],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
