import react from "@vitejs/plugin-react";
import path from "path";
import type { UserConfig } from 'vite'

function _resolve(dir: string) {
  return path.resolve(__dirname, dir);
}
// https://vitejs.dev/config/
export default {
  plugins: [
    react()
  ],
  server: {
    port: 3033
  },
  base: "./",
  resolve: {
    alias: {
      src: _resolve("src"),
    },
  },
  esbuild: {
  },
  build: {
    outDir: "auth_dist",
    // commonjsOptions: {
    //   ignoreTryCatch: false,
    // },
    sourcemap: false,
    rollupOptions: {
      input: {
        index: "index.html",
      },

      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        entryFileNames: "static/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.type === "asset" &&
            /\.(jpe?g|png|gif|svg)$/i.test(assetInfo.name)
          ) {
            return "static/img/[name].[hash][ext]";
          }
          if (
            assetInfo.type === "asset" &&
            /\.(ttf|woff|woff2|eot)$/i.test(assetInfo.name)
          ) {
            return "static/fonts/[name].[hash][ext]";
          }
          return "static/[ext]/name1-[hash].[ext]";
        },
        manualChunks: {},
      },
    },
  },
} satisfies UserConfig;
