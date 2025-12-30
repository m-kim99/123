import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core를 별도 청크로 분리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI 라이브러리를 별도 청크로 분리
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],

          // 차트 라이브러리 분리
          'chart-vendor': ['recharts'],

          // Supabase 분리
          'supabase-vendor': ['@supabase/supabase-js'],

          // 무거운 OCR/PDF 라이브러리를 별도 청크로 분리 (lazy loading용)
          'pdf-vendor': ['pdfjs-dist', 'jspdf'],
        },
      },
    },
    // 청크 크기 경고 임계값 증가 (무거운 라이브러리 때문)
    chunkSizeWarningLimit: 1000,
  },
});
