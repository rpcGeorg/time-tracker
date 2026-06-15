import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// rpc Zeiterfassung – mobile-first prototype implementation
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
