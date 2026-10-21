import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  ssr: true,
  // Opted in to the flags React Router 8 turns on, so the dev server stops warning about them and an upgrade is a version bump (docs/web-architecture.md).
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
    v8_passThroughRequests: true,
    v8_trailingSlashAwareDataRequests: true,
  },
  // Vercel sets VERCEL=1 during builds. Locally we keep the standard
  // `build/server/index.js` layout so `pnpm start` (react-router-serve) works.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
