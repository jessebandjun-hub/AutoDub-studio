import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import os from 'os'
import { EdgeTTS } from './lib/edge-tts'

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

  // 1.5 监听：打开目录对话框
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    })
    if (canceled) return null
    return filePaths[0]
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
  ipcMain.handle('video:export', async (_event, { sourceVideoPath, subtitleData, withDubbing, ttsOptions, subtitleStyle: styleOptions, outputDir, autoSave, bgVolume }) => {
    // 默认 TTS 选项
    const options = {
      voice: 'zh-CN-XiaoxiaoNeural',
      lang: 'zh-CN',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate: '+0%',
      pitch: '+0Hz',
      volume: '+0%',
      style: '',
      ...ttsOptions // 覆盖默认值
    }

    // 字幕样式配置
    const fontSize = styleOptions?.fontSize || 24
    
    // 3.1 弹出保存对话框，让用户选择保存位置
    // 生成带时间戳的文件名：dubbed_output_20231027_143005.mp4
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const defaultFilename = `dubbed_output_${timestamp}.mp4`

    let savePath = ''

    if (autoSave && outputDir) {
        savePath = path.join(outputDir, defaultFilename)
    } else {
        const { canceled, filePath } = await dialog.showSaveDialog(win!, {
            title: '导出配音视频',
            defaultPath: outputDir ? path.join(outputDir, defaultFilename) : defaultFilename,
            filters: [{ name: 'MP4 视频', extensions: ['mp4'] }]
        })
        if (canceled || !filePath) return { status: 'canceled' }
        savePath = filePath
    }

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
      
      // 自定义字幕样式：微软雅黑，字号动态，白字黑边，无背景框
      // BorderStyle=1 (普通描边), Outline=1 (描边宽度), Shadow=0 (无阴影)
      const subtitleStyle = `Fontname=Microsoft YaHei,FontSize=${fontSize},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=20`

      // 如果需要配音，先生成 TTS 音频文件 (按片段生成以精确对齐)
      let ttsFiles: { path: string, start: number }[] = []
      let tempDir = ''

      if (withDubbing) {
        tempDir = await fs.promises.mkdtemp(path.join(app.getPath('temp'), 'autodub-tts-'))
         
         // 改为顺序执行，避免触发服务端限流
         for (let idx = 0; idx < (subtitleData || []).length; idx++) {
             const seg = subtitleData[idx]
             const text = (seg.text || '').toString().trim()
             if (!text) continue
             
             const tts = new EdgeTTS({
                  voice: options.voice,
                  lang: options.lang,
                  outputFormat: options.outputFormat,
                  rate: options.rate,
                  pitch: options.pitch,
                  volume: options.volume,
                  style: options.style
              })
             const audioPath = path.join(tempDir, `seg_${idx}.mp3`)
             try {
                 console.log(`Generating TTS for seg ${idx}: ${text}`)
                 await tts.ttsPromise(text, audioPath)
                 
                 // 验证文件是否生成成功
                 const stat = await fs.promises.stat(audioPath).catch(() => null)
                 if (stat && stat.size > 0) {
                     ttsFiles.push({ path: audioPath, start: seg.start })
                 } else {
                     console.error(`TTS file empty for seg ${idx}`)
                 }
             } catch (e) {
                 console.error(`TTS gen failed for seg ${idx}:`, e)
             }
         }
      }

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg().input(sourceVideoPath)
        
        if (withDubbing && ttsFiles.length > 0) {
            // 添加所有 TTS 片段作为输入
            ttsFiles.forEach(f => command.input(f.path))
            
            // 构建复杂滤镜
            const filterComplex: any[] = []
            const amixInputs: string[] = []
            
            // 0. 准备背景音（原视频音频），先降低音量
            // 如果不想保留背景音，可以去掉这一步
            filterComplex.push({
                filter: 'volume',
                options: (bgVolume !== undefined ? bgVolume : 0.2).toString(), // 背景音音量
                inputs: '0:a',
                outputs: 'bgm'
            })
            amixInputs.push('bgm')

            ttsFiles.forEach((f, i) => {
                const inputIdx = i + 1 // 0 是视频
                const delay = Math.round((f.start || 0) * 1000)
                const outLabel = `delayed${i}`
                
                // adelay: 延迟音频 (单位毫秒)
                // 使用 delay|delay 确保立体声通道都被延迟
                filterComplex.push({
                    filter: 'adelay',
                    options: `${delay}|${delay}`,
                    inputs: `${inputIdx}:a`,
                    outputs: outLabel
                })
                amixInputs.push(outLabel)
            })
            
            // 混合所有音频
            // amix 默认会衰减音量 (1/N)，需要补偿
            const count = amixInputs.length
            filterComplex.push({
                filter: 'amix',
                options: { inputs: count, dropout_transition: 0 },
                inputs: amixInputs,
                outputs: 'amixed'
            })
            
            // 音量补偿: 简单乘以 N (或者根据实际听感调整)
            // 这里我们希望人声清晰，背景音低，amix 会自动平均，所以可能不需要太大的补偿，或者稍微放大一点
            filterComplex.push({
                filter: 'volume',
                options: '2', // 稍微放大混合后的音量
                inputs: 'amixed',
                outputs: 'aout'
            })
            
            command.complexFilter(filterComplex)
            
            command.outputOptions([
                '-map 0:v', 
                '-map [aout]', 
                '-c:v libx264', 
                '-c:a aac',
                '-shortest'
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
          .on('end', async () => {
              // 清理临时文件
              if (tempDir) {
                  try { await fs.promises.rm(tempDir, { recursive: true, force: true }) } catch {}
              }
              resolve()
          })
          .on('error', async (err) => {
              if (tempDir) {
                  try { await fs.promises.rm(tempDir, { recursive: true, force: true }) } catch {}
              }
              reject(err)
          })
      })
      shell.showItemInFolder(savePath)
      return { status: 'success', outputPath: savePath }
    } catch (e: any) {
      console.error(e)
      return { status: 'error', message: e?.message || '导出失败' }
    }
  })

  // 4. 监听：仅导出 SRT 字幕文件
  ipcMain.handle('srt:export', async (_event, { subtitleData, outputDir, autoSave }) => {
    // 生成带时间戳的文件名：subtitle_20231027_143005.srt
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const defaultFilename = `subtitle_${timestamp}.srt`

    let savePath = ''

    if (autoSave && outputDir) {
        savePath = path.join(outputDir, defaultFilename)
    } else {
        const { canceled, filePath } = await dialog.showSaveDialog(win!, {
            title: '导出字幕文件',
            defaultPath: outputDir ? path.join(outputDir, defaultFilename) : defaultFilename,
            filters: [{ name: 'SRT 字幕', extensions: ['srt'] }]
        })
        if (canceled || !filePath) return { status: 'canceled' }
        savePath = filePath
    }

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
  ipcMain.handle('tts:generate', async (_event, { text, options: ttsOptions, preview, outputDir, autoSave }) => {
    try {
      const options = {
        voice: 'zh-CN-XiaoxiaoNeural',
        lang: 'zh-CN',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0%',
        style: '',
        ...ttsOptions
      }
      const tts = new EdgeTTS({
        voice: options.voice,
        lang: options.lang,
        outputFormat: options.outputFormat,
        rate: options.rate,
        pitch: options.pitch,
        volume: options.volume,
        style: options.style
      })
      
      let savePath = ''
      
      if (preview) {
        // 预览模式：保存到临时目录
        const tempDir = app.getPath('temp')
        savePath = path.join(tempDir, `preview_tts_${Date.now()}.mp3`)
      } else {
        // 导出模式：用户选择保存位置
        const now = new Date()
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
        const defaultFilename = `tts_audio_${timestamp}.mp3`
        
        if (autoSave && outputDir) {
            savePath = path.join(outputDir, defaultFilename)
        } else {
            const { canceled, filePath } = await dialog.showSaveDialog(win!, {
                title: '保存 TTS 音频',
                defaultPath: outputDir ? path.join(outputDir, defaultFilename) : defaultFilename,
                filters: [{ name: 'MP3 音频', extensions: ['mp3'] }]
            })

            if (canceled || !filePath) return { status: 'canceled' }
            savePath = filePath
        }
      }

      await tts.ttsPromise(text, savePath)
      
      if (!preview) {
        shell.showItemInFolder(savePath)
      }
      
      return { status: 'success', outputPath: savePath }
    } catch (e: any) {
      console.error(e)
      return { status: 'error', message: e?.message || 'TTS 生成失败' }
    }
  })

  // 6. 监听：Shell 操作
  ipcMain.handle('shell:openPath', async (_event, path) => {
    return await shell.openPath(path)
  })
  
  ipcMain.handle('shell:showItemInFolder', async (_event, path) => {
    shell.showItemInFolder(path)
  })

})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
