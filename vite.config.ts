import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',   // ⭐⭐ 必须加：Vercel 才能正确加载 /assets/*.js

    plugins: [react()],

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),  // 你没 src，这样写是正确的
      },
    },

    build: {
      outDir: 'dist',       // ⭐⭐ 必须加：Vercel 默认部署 dist
      emptyOutDir: true,
    },

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
  };
});
