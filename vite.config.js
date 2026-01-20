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
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs'],
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
        manualChunks(id) {
          // React and React DOM
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          // Split KaTeX separately (it's very large)
          if (id.includes('node_modules/katex')) {
            return 'katex-vendor';
          }
          // MathLive separately
          if (id.includes('node_modules/mathlive')) {
            return 'mathlive-vendor';
          }
          // React-KaTeX
          if (id.includes('node_modules/react-katex')) {
            return 'react-katex-vendor';
          }
          // Editor libraries - split react-quill and quill separately to avoid circular dependency
          if (id.includes('node_modules/react-quill')) {
            return 'react-quill-vendor';
          }
          if (id.includes('node_modules/quill')) {
            return 'quill-vendor';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000, // Increased for math libraries
    // Use esbuild minification (default, faster than terser)
    minify: 'esbuild',
  },
  preview: {
    proxy: {},
  },
})
