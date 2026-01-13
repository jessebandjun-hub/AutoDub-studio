"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const os = require("os");
function getFfmpegPath() {
  const platform = os.platform();
  let executableName = "ffmpeg";
  if (platform === "win32") executableName = "ffmpeg.exe";
  if (electron.app.isPackaged) {
    return path.join(process.resourcesPath, "resources", executableName);
  }
  return path.join(__dirname, "../resources", executableName);
}
const ffmpegPath = getFfmpegPath();
try {
  if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  }
} catch {
}
let win;
const createWindow = () => {
  win = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 重要：开启上下文隔离，保证安全
      contextIsolation: true,
      nodeIntegration: false,
      // 加载预加载脚本作为桥梁
      preload: path.join(__dirname, "preload.js")
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};
electron.app.whenReady().then(() => {
  electron.protocol.registerFileProtocol("local-media", (request, callback) => {
    const url = request.url.replace("local-media:///", "");
    const decodedPath = decodeURIComponent(url);
    callback(decodedPath);
  });
  electron.ipcMain.handle("ffmpeg:status", async () => {
    const exists = fs.existsSync(ffmpegPath);
    return { exists, path: ffmpegPath };
  });
  createWindow();
  electron.ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await electron.dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "Videos", extensions: ["mp4", "mov", "avi", "mkv"] }]
    });
    if (canceled) return null;
    return filePaths[0];
  });
  electron.ipcMain.handle("video:process", async (_event, videoPath) => {
    console.log("Main process received video for processing:", videoPath);
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    return {
      status: "success",
      message: "Audio extracted and analyzed (Mocked Data)",
      // 模拟的字幕片段
      segments: [
        { id: 1, start: 0.5, end: 2, text: "Hello world." },
        { id: 2, start: 2.5, end: 4, text: "This is AutoDub Studio." }
      ]
    };
  });
  electron.ipcMain.handle("video:export", async (_event, { sourceVideoPath, subtitleData }) => {
    const { canceled, filePath: savePath } = await electron.dialog.showSaveDialog(win, {
      title: "导出配音视频",
      defaultPath: "dubbed_output.mp4",
      filters: [{ name: "MP4 视频", extensions: ["mp4"] }]
    });
    if (canceled || !savePath) return { status: "canceled" };
    const exists = fs.existsSync(ffmpegPath);
    if (!exists) {
      await fs.promises.copyFile(sourceVideoPath, savePath);
      electron.shell.showItemInFolder(savePath);
      return { status: "copied", outputPath: savePath, message: "未找到 FFmpeg，已复制原视频" };
    }
    try {
      ffmpeg.setFfmpegPath(ffmpegPath);
      const toTime = (sec) => {
        const ms = Math.max(0, Math.round(sec * 1e3));
        const h = Math.floor(ms / 36e5);
        const m = Math.floor(ms % 36e5 / 6e4);
        const s = Math.floor(ms % 6e4 / 1e3);
        const mm = ms % 1e3;
        const pad = (n, len = 2) => n.toString().padStart(len, "0");
        return `${pad(h)}:${pad(m)}:${pad(s)},${pad(mm, 3)}`;
      };
      const srt = (subtitleData || []).map((seg, idx) => {
        const id = seg.id ?? idx + 1;
        const start = toTime(seg.start ?? 0);
        const end = toTime(seg.end ?? 0);
        const text = (seg.text ?? "").toString().replace(/\r?\n/g, " ");
        return `${id}
${start} --> ${end}
${text}
`;
      }).join("\n");
      const tmpSrt = path.join(electron.app.getPath("temp"), `autodub_${Date.now()}.srt`);
      await fs.promises.writeFile(tmpSrt, srt, "utf-8");
      const normalizedSrt = tmpSrt.replace(/\\/g, "/").replace(/:/g, "\\:");
      await new Promise((resolve, reject) => {
        ffmpeg().input(sourceVideoPath).videoFilters(`subtitles='${normalizedSrt}'`).outputOptions(["-c:a", "copy"]).save(savePath).on("start", (commandLine) => console.log("Spawned Ffmpeg with command: " + commandLine)).on("end", () => resolve()).on("error", (err) => reject(err));
      });
      electron.shell.showItemInFolder(savePath);
      return { status: "success", outputPath: savePath };
    } catch (e) {
      return { status: "error", message: (e == null ? void 0 : e.message) || "导出失败" };
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
