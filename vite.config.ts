import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      hmr: false,       // Completely kills Hot Module Replacement
      liveReload: false, // Prevents full page reloads when assets change
      watch: null,      // Tells Vite to never watch any files on disk
      allowedHosts: true as const,
    },
  };
});