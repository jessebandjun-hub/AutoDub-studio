"use strict";
const electron = require("electron");
const electronHandler = {
  openFileDialog: () => electron.ipcRenderer.invoke("dialog:openFile"),
  processVideo: (filePath) => electron.ipcRenderer.invoke("video:process", filePath),
  exportVideo: (sourceVideoPath, subtitleData) => electron.ipcRenderer.invoke("video:export", { sourceVideoPath, subtitleData }),
  checkFFmpeg: () => electron.ipcRenderer.invoke("ffmpeg:status")
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronHandler);
