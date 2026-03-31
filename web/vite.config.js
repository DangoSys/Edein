import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
