import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // Use relative base so it deploys cleanly to any GitHub Pages subpath
  base: './',
  server: {
    host: true, // Listen on all network interfaces (for local Quest 3 Wi-Fi connection)
    port: 5173,
    https: true, // WebXR requires HTTPS or localhost
  },
  plugins: [
    basicSsl()
  ]
});
