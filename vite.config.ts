import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import { dependencies } from './package.json'

function getExternals(...sources: Record<string, string>[]) {
  return [...new Set(sources.map(getFromDependencies).flat())]
}

function getFromDependencies(dependencies: Record<string, string>) {
  return Object.keys(dependencies ?? {}).map((key) => new RegExp('^' + key))
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    target: "esnext",
    rollupOptions: {
      external: getExternals(dependencies)
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
