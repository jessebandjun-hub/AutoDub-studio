import { useEffect, useRef, useState } from 'react'
import './App.css'

// 模拟的字幕数据类型
type SubtitleSegment = { id: number; start: number; end: number; text: string; }

function App() {
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [segments, setSegments] = useState<SubtitleSegment[]>([])
  const [statusLog, setStatusLog] = useState<string[]>([])
  const videoUrl = videoPath ? `local-media:///${encodeURIComponent(videoPath)}` : ''
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [editing, setEditing] = useState(false)

  // TTS 配置状态
  const [ttsConfig, setTtsConfig] = useState({
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+0%'
  })

  // 字幕样式配置
  const [fontSize, setFontSize] = useState(12)

  // 常用语音列表
  const voiceOptions = [
    { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓 (女声 - 温暖 - 默认)' },
    { value: 'zh-CN-YunxiNeural', label: '云希 (男声 - 稳重)' },
    { value: 'zh-CN-YunjianNeural', label: '云健 (男声 - 体育)' },
    { value: 'zh-CN-XiaoyiNeural', label: '晓伊 (女声 - 情感)' },
    { value: 'zh-CN-YunyangNeural', label: '云扬 (男声 - 新闻)' },
    { value: 'zh-CN-XiaoshuangNeural', label: '晓双 (女声 - 儿童)' },
    { value: 'zh-CN-YunfengNeural', label: '云枫 (男声)' },
    { value: 'zh-HK-HiuGaaiNeural', label: 'HiuGaai (粤语女声)' },
    { value: 'zh-TW-HsiaoChenNeural', label: 'HsiaoChen (台湾女声)' },
  ]

  const rateOptions = [
    { value: '-25%', label: '0.75x (慢)' },
    { value: '+0%', label: '1.0x (正常)' },
    { value: '+25%', label: '1.25x (快)' },
  ]

  const addLog = (msg: string) => setStatusLog(prev => [...prev, `> ${msg}`])

  useEffect(() => {
    (async () => {
      const info = await window.electronAPI.checkFFmpeg()
      if (info.exists) {
        addLog(`检测到 FFmpeg：${info.path}`)
      } else {
        addLog('未检测到 FFmpeg，请将 ffmpeg.exe 放入 resources 后重试')
      }
    })()
  }, [])

  // 1. 选择文件
  const handleSelectFile = async () => {
    const path = await window.electronAPI.openFileDialog()
    if (path) {
      setVideoPath(path)
      addLog(`已选择视频：${path}`)
      // 重置状态
      setSegments([])
    }
  }

  // 2. 开始处理 (模拟 AI 流程)
  const handleProcess = async () => {
    if (!videoPath) return
    setIsProcessing(true)
    addLog('开始 AI 处理（模拟 Whisper/翻译）...')
    
    try {
      // 调用主进程
      const result = await window.electronAPI.processVideo(videoPath)
      addLog(result.message)
      setSegments(result.segments) // 保存模拟的字幕数据
    } catch (error) {
      addLog('处理过程中出错。')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  // 3. 导出视频
  const handleExport = async (withDubbing = false) => {
    if (!videoPath || segments.length === 0) return
    setIsExporting(true)
    const logPrefix = withDubbing ? '配音视频' : '字幕视频'
    addLog(`开始导出${logPrefix}... 请先选择保存位置。`)

    try {
      // 调用主进程进行导出，传入原视频路径和当前的字幕数据，以及 TTS 配置和字幕样式
      const result = await window.electronAPI.exportVideo(videoPath, segments, withDubbing, ttsConfig, { fontSize })
      if (result.status === 'success') {
        addLog(`${logPrefix}导出成功！保存路径：${result.outputPath}`)
      } else if (result.status === 'copied') {
        addLog(`未找到 FFmpeg，已复制原视频到：${result.outputPath}`)
      } else if (result.status === 'canceled') {
        addLog('用户取消导出。')
      } else if (result.status === 'error') {
        addLog(`导出失败：${result.message || '未知错误'}`)
      }
    } catch (error) {
       addLog('导出过程中出错。')
    } finally {
      setIsExporting(false)
    }
  }

  // 4. 导出 SRT
  const handleExportSrt = async () => {
    if (segments.length === 0) return
    try {
      const result = await window.electronAPI.exportSrt(segments)
      if (result.status === 'success') {
        addLog(`SRT 导出成功！路径：${result.outputPath}`)
      } else if (result.status === 'canceled') {
        addLog('用户取消导出 SRT。')
      } else if (result.status === 'error') {
        addLog(`导出 SRT 失败：${result.message}`)
      }
    } catch (error) {
      addLog('导出 SRT 过程中出错。')
    }
  }

  const handleTtsGenerate = async () => {
    if (segments.length === 0) {
      addLog('没有可用的字幕片段。')
      return
    }
    const fullText = segments.map(seg => seg.text).join('，') // 使用逗号连接，停顿更自然
    addLog('正在调用 Edge TTS 生成音频...')
    try {
      const result = await window.electronAPI.generateAudio(fullText, ttsConfig)
      if (result.status === 'success') {
        addLog(`TTS 音频生成成功！路径：${result.outputPath}`)
      } else if (result.status === 'canceled') {
        addLog('用户取消 TTS 生成。')
      } else if (result.status === 'error') {
        addLog(`TTS 生成失败：${result.message}`)
      }
    } catch (error) {
      addLog('TTS 生成出错。')
    }
  }

  return (
    <div className="container">

      {!videoPath ? (
        <div className="card">
          <button onClick={handleSelectFile} disabled={isProcessing || isExporting}>选择视频文件</button>
        </div>
      ) : (
        <div className="main-layout">
          <div className="left-panel">
            <div className="card">
              <video className="video-player" src={videoUrl} controls ref={videoRef} />
              <p className="path-display">当前：{videoPath}</p>
              <button onClick={handleSelectFile} disabled={isProcessing || isExporting}>更换视频</button>
            </div>
          </div>
          <div className="right-panel">
            <div className="timeline-mock">
          <h3>字幕编辑：</h3>
          <div className="card action-card">
            <button
              onClick={() => {
                const t = videoRef.current?.currentTime ?? 0
                const nextId = (segments.reduce((m, s) => Math.max(m, s.id), 0) || 0) + 1
                const newSeg: SubtitleSegment = { id: nextId, start: parseFloat(t.toFixed(2)), end: parseFloat((t + 2).toFixed(2)), text: '新字幕片段' }
                setSegments(prev => [...prev, newSeg])
                // 自动开启编辑模式
                setEditing(true)
              }}
            >
              + 添加字幕片段 (在当前时间)
            </button>
          </div>

          <div className="editor">
            {segments.length === 0 && <p style={{ color: '#888' }}>暂无字幕，请点击上方按钮添加。</p>}
            {segments.map((seg, idx) => (
              <div className="editor-row" key={seg.id}>
                <span className="editor-id">#{seg.id}</span>
                <input
                  className="editor-num"
                  type="number"
                  step="0.01"
                  value={seg.start}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setSegments(prev => prev.map(s => (s.id === seg.id ? { ...s, start: isNaN(v) ? 0 : v } : s)))
                  }}
                />
                <input
                  className="editor-num"
                  type="number"
                  step="0.01"
                  value={seg.end}
                  onChange={e => {
                    const v = parseFloat(e.target.value)
                    setSegments(prev => prev.map(s => (s.id === seg.id ? { ...s, end: isNaN(v) ? 0 : v } : s)))
                  }}
                />
                <input
                  className="editor-text"
                  type="text"
                  value={seg.text}
                  onChange={e => {
                    const v = e.target.value
                    setSegments(prev => prev.map(s => (s.id === seg.id ? { ...s, text: v } : s)))
                  }}
                />
                <button
                  onClick={() => {
                    const t = videoRef.current?.currentTime ?? 0
                    setSegments(prev => prev.map(s => (s.id === seg.id ? { ...s, start: parseFloat(t.toFixed(2)) } : s)))
                  }}
                >
                  设为当前开始
                </button>
                <button
                  onClick={() => {
                    const t = videoRef.current?.currentTime ?? 0
                    setSegments(prev => prev.map(s => (s.id === seg.id ? { ...s, end: parseFloat(t.toFixed(2)) } : s)))
                  }}
                >
                  设为当前结束
                </button>
                <button
                  onClick={() => {
                    setSegments(prev => prev.filter(s => s.id !== seg.id))
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          {segments.length > 0 && (
            <>
              <div className="card" style={{ marginBottom: 15 }}>
                <h3>导出设置：</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label>
                    配音角色：
                    <select
                      value={ttsConfig.voice}
                      onChange={e => setTtsConfig(prev => ({ ...prev, voice: e.target.value }))}
                    >
                      {voiceOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    语速：
                    <select
                      value={ttsConfig.rate}
                      onChange={e => setTtsConfig(prev => ({ ...prev, rate: e.target.value }))}
                    >
                      {rateOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    字幕大小：
                    <input
                      type="number"
                      value={fontSize}
                      onChange={e => setFontSize(Number(e.target.value))}
                      style={{ width: '60px' }}
                      min="10"
                      max="100"
                    />
                  </label>
                </div>
              </div>

              <div className="card action-card">
                {/* <button className="export-btn" onClick={() => handleExport(false)} disabled={isExporting}>
                    {isExporting ? '导出中...' : '导出视频（烧录字幕）'}
                </button> */}
                <button className="export-btn" onClick={() => handleExport(true)} disabled={isExporting} style={{ marginLeft: 10, backgroundColor: '#8a2be2' }}>
                    导出配音视频 (TTS+字幕)
                </button>
                <button className="export-btn" onClick={handleExportSrt} disabled={isExporting} style={{ marginLeft: 10 }}>
                    导出 SRT 字幕文件
                </button>
                <button className="export-btn" onClick={handleTtsGenerate} disabled={isExporting} style={{ marginLeft: 10, backgroundColor: '#0078d4' }}>
                    字幕转音频 (Edge TTS)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )}

       <div className="log-box">
         {statusLog.map((log, idx) => <div key={idx}>{log}</div>)}
       </div>
    </div>
  )
}

export default App
