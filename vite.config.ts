import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  assetsInclude: ['**/*.md'], // 支持导入markdown文件作为资源
  server: {
    proxy: {
      // 代理火山引擎TTS API
      '/api/tts': {
        target: 'https://openspeech.bytedance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, '/api/v3/tts'),
        secure: true,
        headers: {
          'Origin': 'https://openspeech.bytedance.com',
        },
      },
    },
  },
});
