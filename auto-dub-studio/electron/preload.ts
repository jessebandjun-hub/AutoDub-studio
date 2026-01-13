import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给 React 的 API 接口类型
export interface IElectronAPI {
  openFileDialog: () => Promise<string | null>,
  processVideo: (filePath: string) => Promise<any>,
  exportVideo: (sourceVideoPath: string, subtitleData: any[]) => Promise<any>,
  checkFFmpeg: () => Promise<{ exists: boolean; path: string }>,
}

// 实现 API
const electronHandler: IElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  processVideo: (filePath) => ipcRenderer.invoke('video:process', filePath),
  exportVideo: (sourceVideoPath, subtitleData) => ipcRenderer.invoke('video:export', { sourceVideoPath, subtitleData }),
  checkFFmpeg: () => ipcRenderer.invoke('ffmpeg:status'),
}

// 将 API 暴露到全局 window 对象上，命名为 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronHandler)
