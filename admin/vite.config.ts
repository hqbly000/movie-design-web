import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// dev:remote 模式（npm run dev:remote）→ API 代理到公网服务器，本地无需启动后端
// dev 默认模式 → 维持本地联调（VITE_API_BASE 直连 127.0.0.1:8000）
export default defineConfig(({ mode }) => {
  const apiTarget =
    mode === 'remote' ? 'http://124.223.29.189' : 'http://127.0.0.1:8000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: true,
      port: 5174,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1200
    }
  }
})
