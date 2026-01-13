import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给 React 的 API 接口类型
export interface IElectronAPI {
  openFileDialog: () => Promise<string | null>,
  processVideo: (filePath: string) => Promise<any>,
  exportVideo: (sourceVideoPath: string, subtitleData: any[], withDubbing?: boolean, ttsOptions?: any, subtitleStyle?: any) => Promise<any>,
  exportSrt: (subtitleData: any[]) => Promise<any>,
  generateAudio: (text: string, options?: any) => Promise<any>,
  checkFFmpeg: () => Promise<{ exists: boolean; path: string }>,
}

// 实现 API
const electronHandler: IElectronAPI = {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  processVideo: (filePath) => ipcRenderer.invoke('video:process', filePath),
  exportVideo: (sourceVideoPath, subtitleData, withDubbing = false, ttsOptions = {}, subtitleStyle = {}) => ipcRenderer.invoke('video:export', { sourceVideoPath, subtitleData, withDubbing, ttsOptions, subtitleStyle }),
  exportSrt: (subtitleData) => ipcRenderer.invoke('srt:export', subtitleData),
  generateAudio: (text, options = {}) => ipcRenderer.invoke('tts:generate', { text, options }),
  checkFFmpeg: () => ipcRenderer.invoke('ffmpeg:status'),
}

// 将 API 暴露到全局 window 对象上，命名为 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronHandler)
