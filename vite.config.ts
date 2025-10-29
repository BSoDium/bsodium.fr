/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { imagetools } from "vite-imagetools";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
    }),
    svgr(),
    imagetools({
      defaultDirectives: async (url, meta) => {
        if (url.searchParams.has("progressive")) {
          // Get metadata to access original image dimensions
          const metadata = await meta();
          const originalWidth = metadata.width;

          // Generate widths based on percentages of original image width
          // Using common responsive breakpoint percentages
          const percentages = [0.15, 0.35, 0.65, 1.0]; // 15%, 35%, 65%, 100%
          const widths = percentages
            .map((p) => Math.round(originalWidth * p))
            .filter((w) => w >= 20) // Ensure minimum width of 20px
            .filter((w, i, arr) => i === 0 || w > arr[i - 1] + 10) // Remove too-similar widths
            .join(";");
          return new URLSearchParams({
            w: widths,
            format: "avif;webp;png",
            as: "metadata",
          });
        }
        return new URLSearchParams();
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: "/src",
      },
      {
        find: "@public",
        replacement: "/public",
      },
    ],
  },
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
