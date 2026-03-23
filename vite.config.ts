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
 * The host name for the Vite dev server. This is used to generate the local SSL certificate with mkcert and to configure the dev server to use this host name. By using a custom host name instead of localhost, we can ensure that the SSL certificate is valid for the dev server, which allows us to use HTTPS in development without browser warnings about invalid certificates. The mkcert plugin will generate a certificate for this host name and add it to the system's trusted certificates, so that the browser will trust it when connecting to the dev server.
 */
const hostName = `catalyst.localhost`;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  server: {
    host: hostName,
    port: 5173,
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    reactRouter(),
    mkcert({ hosts: [hostName] }),
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
