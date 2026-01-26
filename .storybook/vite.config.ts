import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Storybook-specific Vite configuration.
 * 
 * This config excludes the React Router Vite plugin which is incompatible
 * with Storybook's build process (it requires a Vite config file in a
 * specific format that Storybook doesn't provide).
 */
export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
  ],
});
