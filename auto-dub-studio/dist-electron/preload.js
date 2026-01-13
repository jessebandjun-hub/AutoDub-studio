"use strict";
const electron = require("electron");
const electronHandler = {
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  processVideo: (filePath) => electron.ipcRenderer.invoke("video:process", filePath),
  exportVideo: (sourceVideoPath, subtitleData) => electron.ipcRenderer.invoke("video:export", { sourceVideoPath, subtitleData }),
  exportSrt: (subtitleData) => electron.ipcRenderer.invoke("srt:export", subtitleData),
  generateAudio: (text) => electron.ipcRenderer.invoke("tts:generate", text),
  checkFFmpeg: () => electron.ipcRenderer.invoke("ffmpeg:status")
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronHandler);
