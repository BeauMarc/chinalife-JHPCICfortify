
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 注入环境变量，确保在 Cloudflare Pages 构建环境下能抓取到 API_KEY
  const env = loadEnv(mode, process.cwd(), '');
  
  // 优先级：系统环境变量 > .env 文件变量
  const finalApiKey = process.env.API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // 这里的注入非常关键，决定了前端 getApiKey() 能拿到什么
      'process.env.API_KEY': JSON.stringify(finalApiKey)
    }
  }
})
