import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import path from 'path'
import fs from 'fs'

// 每次构建前清理 dist-electron
fs.rmSync('dist-electron', { recursive: true, force: true })

// `https://vitejs.dev/config/` 
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // 主进程入口
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
                external: ['fluent-ffmpeg'] // 告诉打包工具这是外部依赖
            }
          },
        },
      },
      {
        // 预加载脚本入口
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
            build: {
                outDir: 'dist-electron',
            }
        }
      },
    ]),
  ],
})
