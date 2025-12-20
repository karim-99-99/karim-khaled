import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle SPA routing
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Skip static assets (files with extensions)
            if (req.url && 
                req.url !== '/' && 
                !req.url.startsWith('/api') && 
                !req.url.includes('.')) {
              // This is a client-side route, serve index.html
              req.url = '/index.html';
            }
            next();
          });
        };
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  preview: {
    // For preview mode, ensure fallback to index.html
    proxy: {},
  },
})
