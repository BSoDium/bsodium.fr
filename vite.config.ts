import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { imagetools } from "vite-imagetools";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
    }),
    svgr(),
    imagetools({
      defaultDirectives: (url) => {
        if (url.searchParams.has('progressive')) {
          return new URLSearchParams({
            w: '20;400;800;1200',
            format: 'webp;png',
            as: 'metadata',
          })
        }
        return new URLSearchParams()
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: "/src" },
      { find: "@public", replacement: "/public" },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },
});
