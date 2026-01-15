"use strict";
const electron = require("electron");
const electronHandler = {
  openFileDialog: (options = {}) => electron.ipcRenderer.invoke("dialog:openFile", options),
  openDirectory: () => electron.ipcRenderer.invoke("dialog:openDirectory"),
  processVideo: (filePath) => electron.ipcRenderer.invoke("video:process", filePath),
  exportVideo: (sourceVideoPath, subtitleData, withDubbing = false, ttsOptions = {}, subtitleStyle = {}, outputDir = "", autoSave = false, bgVolume = 0.3, bgmPath = "") => electron.ipcRenderer.invoke("video:export", { sourceVideoPath, subtitleData, withDubbing, ttsOptions, subtitleStyle, outputDir, autoSave, bgVolume, bgmPath }),
  exportSrt: (subtitleData, outputDir = "", autoSave = false) => electron.ipcRenderer.invoke("srt:export", { subtitleData, outputDir, autoSave }),
  generateAudio: (text, options = {}, preview = false, outputDir = "", autoSave = false) => electron.ipcRenderer.invoke("tts:generate", { text, options, preview, outputDir, autoSave }),
  checkFFmpeg: () => electron.ipcRenderer.invoke("ffmpeg:status"),
  openPath: (path) => electron.ipcRenderer.invoke("shell:openPath", path),
  showItemInFolder: (path) => electron.ipcRenderer.invoke("shell:showItemInFolder", path)
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronHandler);
