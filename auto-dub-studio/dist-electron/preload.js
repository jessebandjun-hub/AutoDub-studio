"use strict";
const electron = require("electron");
const electronHandler = {
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  processVideo: (filePath) => electron.ipcRenderer.invoke("video:process", filePath),
  exportVideo: (sourceVideoPath, subtitleData, withDubbing = false, ttsOptions = {}, subtitleStyle = {}) => electron.ipcRenderer.invoke("video:export", { sourceVideoPath, subtitleData, withDubbing, ttsOptions, subtitleStyle }),
  exportSrt: (subtitleData) => electron.ipcRenderer.invoke("srt:export", subtitleData),
  generateAudio: (text, options = {}) => electron.ipcRenderer.invoke("tts:generate", { text, options }),
  checkFFmpeg: () => electron.ipcRenderer.invoke("ffmpeg:status")
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronHandler);
