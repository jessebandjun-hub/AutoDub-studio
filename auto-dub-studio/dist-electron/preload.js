"use strict";
const electron = require("electron");
const electronHandler = {
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  processVideo: (filePath) => electron.ipcRenderer.invoke("video:process", filePath),
  exportVideo: (sourceVideoPath, subtitleData, withDubbing = false, ttsOptions = {}) => electron.ipcRenderer.invoke("video:export", { sourceVideoPath, subtitleData, withDubbing, ttsOptions }),
  exportSrt: (subtitleData) => electron.ipcRenderer.invoke("srt:export", subtitleData),
  generateAudio: (text, options = {}) => electron.ipcRenderer.invoke("tts:generate", { text, options }),
  checkFFmpeg: () => electron.ipcRenderer.invoke("ffmpeg:status")
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronHandler);
