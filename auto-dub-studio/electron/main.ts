import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import os from 'os'
// @ts-ignore
import { EdgeTTS } from 'node-edge-tts'

// --- 核心：定位本地 FFmpeg 二进制文件 ---
// 在开发环境和打包后的生产环境，路径是不一样的。
function getFfmpegPath() {
  const platform = os.platform()
  let executableName = 'ffmpeg'
  if (platform === 'win32') executableName = 'ffmpeg.exe'

  // 如果是打包后的环境 (Production)
  if (app.isPackaged) {
    // 路径通常在 resources/resources/ffmpeg.exe
    return path.join(process.resourcesPath, 'resources', executableName)
  }

  // 如果是开发环境 (Development)
  // 路径在项目根目录下的 resources/ffmpeg.exe
  // __dirname 是 dist-electron，所以上一级是项目根目录
  return path.join(__dirname, '../resources', executableName)
}

// 设置 ffmpeg 路径
const ffmpegPath = getFfmpegPath()
try {
  if (fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath)
  }
} catch {}


let win: BrowserWindow | null

const createWindow = () => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // 重要：开启上下文隔离，保证安全
      contextIsolation: true,
      nodeIntegration: false,
      // 加载预加载脚本作为桥梁
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // 开发环境加载 Vite 开发服务器地址，生产环境加载打包后的 html
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools() // 开发时打开控制台
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('local-media', (request, callback) => {
    const url = request.url.replace('local-media:///', '')
    const decodedPath = decodeURIComponent(url)
    callback(decodedPath)
  })
  ipcMain.handle('ffmpeg:status', async () => {
    const exists = fs.existsSync(ffmpegPath)
    return { exists, path: ffmpegPath }
  })
  createWindow()

  // --- IPC 监听：处理来自 React 的请求 ---

  // 1. 监听：打开文件对话框
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
    })
    if (canceled) return null
    return filePaths[0] // 返回选择的视频路径
  })

  // 2. 监听：执行处理 (模拟 FFmpeg 调用)
  ipcMain.handle('video:process', async (_event, videoPath) => {
    console.log('Main process received video for processing:', videoPath)
    
    // --- 未来在这里编写核心逻辑 ---
    // 1. 调用 ffmpeg.setFfmpegPath(getFfmpegPath())
    // 2. ffmpeg(videoPath).extractAudio(...) 提取音频
    // 3. 调用 Whisper 模型转录...
    
    // 模拟耗时操作
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 返回模拟数据
    return { 
        status: 'success', 
        message: 'Audio extracted and analyzed (Mocked Data)',
        // 模拟的字幕片段
        segments: [
            { id: 1, start: 0.5, end: 2.0, text: "Hello world." },
            { id: 2, start: 2.5, end: 4.0, text: "This is AutoDub Studio." }
        ]
    }
  })

  // 3. 监听：导出成品视频
  ipcMain.handle('video:export', async (_event, { sourceVideoPath, subtitleData, withDubbing, ttsOptions }) => {
    // 默认 TTS 选项
    const options = {
      voice: 'zh-CN-XiaoxiaoNeural',
      lang: 'zh-CN',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate: '+0%',
      pitch: '+0Hz',
      volume: '+0%',
      ...ttsOptions // 覆盖默认值
    }

    // 3.1 弹出保存对话框，让用户选择保存位置
    // 生成带时间戳的文件名：dubbed_output_20231027_143005.mp4
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const defaultFilename = `dubbed_output_${timestamp}.mp4`

    const { canceled, filePath: savePath } = await dialog.showSaveDialog(win!, {
        title: '导出配音视频',
        defaultPath: defaultFilename,
        filters: [{ name: 'MP4 视频', extensions: ['mp4'] }]
    })

    if (canceled || !savePath) return { status: 'canceled' }

    const exists = fs.existsSync(ffmpegPath)
    if (!exists) {
      await fs.promises.copyFile(sourceVideoPath, savePath)
      shell.showItemInFolder(savePath)
      return { status: 'copied', outputPath: savePath, message: '未找到 FFmpeg，已复制原视频' }
    }
    try {
      // 设置 ffmpeg 路径
      ffmpeg.setFfmpegPath(ffmpegPath)
      // 生成临时 SRT
      const toTime = (sec: number) => {
        const ms = Math.max(0, Math.round(sec * 1000))
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        const s = Math.floor((ms % 60000) / 1000)
        const mm = ms % 1000
        const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
        return `${pad(h)}:${pad(m)}:${pad(s)},${pad(mm, 3)}`
      }
      const srt = (subtitleData || []).map((seg: any, idx: number) => {
        const id = seg.id ?? idx + 1
        const start = toTime(seg.start ?? 0)
        const end = toTime(seg.end ?? 0)
        const text = (seg.text ?? '').toString().replace(/\r?\n/g, ' ')
        return `${id}\n${start} --> ${end}\n${text}\n`
      }).join('\n')
      const tmpSrt = path.join(app.getPath('temp'), `autodub_${Date.now()}.srt`)
      await fs.promises.writeFile(tmpSrt, srt, 'utf-8')

      // 修复 Windows 下滤镜路径问题：
      // 1. 反斜杠转正斜杠
      // 2. 盘符冒号转义 (C: -> C\:)
      // 3. 包裹在单引号中以处理空格
      const normalizedSrt = tmpSrt.replace(/\\/g, '/').replace(/:/g, '\\:')
      
      // 自定义字幕样式：微软雅黑，字号24，白字黑边，无背景框
      // BorderStyle=1 (普通描边), Outline=1 (描边宽度), Shadow=0 (无阴影)
      const subtitleStyle = "Fontname=Microsoft YaHei,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=20"

      // 如果需要配音，先生成 TTS 音频文件
      let ttsAudioPath = ''
      if (withDubbing) {
        const fullText = (subtitleData || []).map((s: any) => s.text).join('，')
        const tts = new EdgeTTS({
            voice: options.voice,
            lang: options.lang,
            outputFormat: options.outputFormat,
            rate: options.rate,
            pitch: options.pitch,
            volume: options.volume
        })
        ttsAudioPath = path.join(app.getPath('temp'), `tts_temp_${Date.now()}.mp3`)
        await tts.ttsPromise(fullText, ttsAudioPath)
      }

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg().input(sourceVideoPath)
        
        if (withDubbing && ttsAudioPath) {
            command.input(ttsAudioPath)
            // 映射原视频的视频流 (0:v) 和 TTS 的音频流 (1:a)
            // -c:v libx264 重新编码视频以烧录字幕
            // -c:a aac 编码音频
            // -shortest 以最短的流为准（防止音频过长），但通常我们希望视频完整。
            // 这里的策略是：视频多长就多长，音频不够就没声音，音频多了就截断。
            // 使用 -map 0:v -map 1:a 即可。
            command.outputOptions([
                '-map 0:v', 
                '-map 1:a', 
                '-c:v libx264', 
                '-c:a aac',
                '-shortest' // 确保输出长度不超过视频或音频的最短者
            ])
        } else {
            // 原逻辑：复制音频
            command.outputOptions(['-c:a', 'copy'])
        }

        command
          // 添加 force_style 参数来美化字幕
          .videoFilters(`subtitles='${normalizedSrt}':force_style='${subtitleStyle}'`)
          .save(savePath)
          .on('start', (commandLine) => console.log('Spawned Ffmpeg with command: ' + commandLine))
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
      })
      shell.showItemInFolder(savePath)
      return { status: 'success', outputPath: savePath }
    } catch (e: any) {
      console.error(e)
      return { status: 'error', message: e?.message || '导出失败' }
    }
  })

  // 4. 监听：仅导出 SRT 字幕文件
  ipcMain.handle('srt:export', async (_event, subtitleData) => {
    // 生成带时间戳的文件名：subtitle_20231027_143005.srt
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const defaultFilename = `subtitle_${timestamp}.srt`

    const { canceled, filePath: savePath } = await dialog.showSaveDialog(win!, {
      title: '导出字幕文件',
      defaultPath: defaultFilename,
      filters: [{ name: 'SRT 字幕', extensions: ['srt'] }]
    })

    if (canceled || !savePath) return { status: 'canceled' }

    try {
      // 简单的 SRT 时间格式化函数 (复用逻辑)
      const toTime = (sec: number) => {
        const ms = Math.max(0, Math.round(sec * 1000))
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        const s = Math.floor((ms % 60000) / 1000)
        const mm = ms % 1000
        const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
        return `${pad(h)}:${pad(m)}:${pad(s)},${pad(mm, 3)}`
      }

      const srtContent = (subtitleData || []).map((seg: any, idx: number) => {
        const id = seg.id ?? idx + 1
        const start = toTime(seg.start ?? 0)
        const end = toTime(seg.end ?? 0)
        const text = (seg.text ?? '').toString().replace(/\r?\n/g, ' ')
        return `${id}\n${start} --> ${end}\n${text}\n`
      }).join('\n')
      await fs.promises.writeFile(savePath, srtContent, 'utf-8')
      shell.showItemInFolder(savePath)
      return { status: 'success', outputPath: savePath }
    } catch (e: any) {
      return { status: 'error', message: e?.message || '导出 SRT 失败' }
    }
  })

  // 5. 监听：TTS 字幕转音频
  ipcMain.handle('tts:generate', async (_event, { text, options: ttsOptions }) => {
    try {
      const options = {
        voice: 'zh-CN-XiaoxiaoNeural',
        lang: 'zh-CN',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0%',
        ...ttsOptions
      }
      const tts = new EdgeTTS({
        voice: options.voice,
        lang: options.lang,
        outputFormat: options.outputFormat,
        rate: options.rate,
        pitch: options.pitch,
        volume: options.volume
      })
      
      const now = new Date()
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const defaultFilename = `tts_audio_${timestamp}.mp3`
      
      const { canceled, filePath: savePath } = await dialog.showSaveDialog(win!, {
        title: '保存 TTS 音频',
        defaultPath: defaultFilename,
        filters: [{ name: 'MP3 音频', extensions: ['mp3'] }]
      })

      if (canceled || !savePath) return { status: 'canceled' }

      await tts.ttsPromise(text, savePath)
      shell.showItemInFolder(savePath)
      return { status: 'success', outputPath: savePath }
    } catch (e: any) {
      console.error(e)
      return { status: 'error', message: e?.message || 'TTS 生成失败' }
    }
  })

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
