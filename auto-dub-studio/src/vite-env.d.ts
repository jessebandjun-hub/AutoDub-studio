/// <reference types="vite/client" />
import { IElectronAPI } from '../electron/preload'

declare global {
  interface Window {
    // 将我们在 preload 中定义的类型扩展到全局 window
    electronAPI: IElectronAPI
  }
}
