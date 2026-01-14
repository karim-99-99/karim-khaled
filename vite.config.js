import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle SPA routing
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          // Intercept all requests and serve index.html for client routes
          const originalListen = server.listen;
          
          // Add middleware that runs early in the request chain
          server.middlewares.use((req, res, next) => {
            const url = req.url || '';
            const urlPath = url.split('?')[0].split('#')[0];
            
            // Skip root
            if (urlPath === '/') {
              return next();
            }
            
            // List of file extensions that should be served as-is
            const fileExtensions = ['.js', '.mjs', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map', '.webp', '.avif'];
            const hasFileExtension = fileExtensions.some(ext => urlPath.toLowerCase().endsWith(ext));
            
            // Vite internal paths
            const vitePaths = ['/@vite/', '/@id/', '/@fs/', '/@react-refresh', '/node_modules/', '/src/', '/assets/', '/public/'];
            const isVitePath = vitePaths.some(path => urlPath.startsWith(path));
            
            // If it's not a file and not a Vite internal path, serve index.html
            if (!hasFileExtension && !isVitePath && !urlPath.startsWith('/api/')) {
              // Store original URL for debugging
              const originalUrl = req.url;
              req.url = '/index.html';
              
              // Continue with modified URL
              next();
            } else {
              next();
            }
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
    // Exclude ALL CKEditor packages to prevent duplication
    // CKEditor 5 should not be pre-bundled by Vite to avoid module duplication
    exclude: [
      'mathquill',
      '@wiris/mathtype-ckeditor5',
      '@ckeditor/ckeditor5-react',
      '@ckeditor/ckeditor5-editor-classic',
      '@ckeditor/ckeditor5-essentials',
      '@ckeditor/ckeditor5-basic-styles',
      '@ckeditor/ckeditor5-heading',
      '@ckeditor/ckeditor5-list',
      '@ckeditor/ckeditor5-link',
      '@ckeditor/ckeditor5-image',
      '@ckeditor/ckeditor5-undo',
      'ckeditor5',
    ],
  },
  server: {
    fs: {
      strict: false,
    },
  },
  build: {
    commonjsOptions: {
      include: [/mathquill/, /node_modules/],
    },
    // Enable code splitting and optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'math-vendor': ['katex', 'react-katex', 'mathlive'],
          'editor-vendor': ['react-quill', 'quill'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  preview: {
    proxy: {},
  },
})
