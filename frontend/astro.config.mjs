import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    server: {
      proxy: {
        // 本地开发时把后台接口代理到独立 Node 服务（server/，默认 3001）
        // 注意：/p/ 必须带尾斜杠，否则前缀匹配会误伤 /photographers 等静态资源
        '/api': 'http://127.0.0.1:3001',
        '/p/': 'http://127.0.0.1:3001',
        '/uploads': 'http://127.0.0.1:3001'
      }
    }
  }
});
