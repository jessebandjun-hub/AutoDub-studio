import { contextBridge, ipcRenderer } from 'electron'

// 定义暴露给 React 的 API 接口类型
export interface IElectronAPI {
  openFileDialog: (options?: any) => Promise<string | null>,
  openDirectory: () => Promise<string | null>,
  processVideo: (filePath: string) => Promise<any>,
  exportVideo: (sourceVideoPath: string, subtitleData: any[], withDubbing?: boolean, ttsOptions?: any, subtitleStyle?: any, outputDir?: string, autoSave?: boolean, bgVolume?: number, bgmPath?: string) => Promise<any>,
  exportSrt: (subtitleData: any[], outputDir?: string, autoSave?: boolean) => Promise<any>,
  generateAudio: (text: string, options?: any, preview?: boolean, outputDir?: string, autoSave?: boolean) => Promise<any>,
  checkFFmpeg: () => Promise<{ exists: boolean; path: string }>,
  openPath: (path: string) => Promise<string>,
  showItemInFolder: (path: string) => Promise<void>,
  saveFile: (buffer: ArrayBuffer, fileName: string, outputDir?: string, autoSave?: boolean) => Promise<any>,
}

// 实现 API
const electronHandler: IElectronAPI = {
  openFileDialog: (options = {}) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  processVideo: (filePath) => ipcRenderer.invoke('video:process', filePath),
  exportVideo: (sourceVideoPath, subtitleData, withDubbing = false, ttsOptions = {}, subtitleStyle = {}, outputDir = '', autoSave = false, bgVolume = 0.3, bgmPath = '') => ipcRenderer.invoke('video:export', { sourceVideoPath, subtitleData, withDubbing, ttsOptions, subtitleStyle, outputDir, autoSave, bgVolume, bgmPath }),
  exportSrt: (subtitleData, outputDir = '', autoSave = false) => ipcRenderer.invoke('srt:export', { subtitleData, outputDir, autoSave }),
  generateAudio: (text, options = {}, preview = false, outputDir = '', autoSave = false) => ipcRenderer.invoke('tts:generate', { text, options, preview, outputDir, autoSave }),
  checkFFmpeg: () => ipcRenderer.invoke('ffmpeg:status'),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
  saveFile: (buffer, fileName, outputDir = '', autoSave = false) => ipcRenderer.invoke('file:save', { buffer, fileName, outputDir, autoSave }),
}

// 将 API 暴露到全局 window 对象上，命名为 window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronHandler)
