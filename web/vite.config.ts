import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: true,
    // A sibling project's install leaks onto the resolve path; relax the
    // dev file-serving allowlist so Vite's own client module loads cleanly.
    fs: { strict: false },
  },
});
