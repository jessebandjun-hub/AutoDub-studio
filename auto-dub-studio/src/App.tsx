import { useEffect, useRef, useState } from 'react'
import './App.css'
import { ToneGenerator } from './lib/music-generator'

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
  const [previewFile, setPreviewFile] = useState<string | null>(null)

  // 输出目录配置
  const [outputDir, setOutputDir] = useState('')
  const [autoSave, setAutoSave] = useState(false)

  useEffect(() => {
    const savedDir = localStorage.getItem('outputDir')
    const savedAuto = localStorage.getItem('autoSave')
    if (savedDir) setOutputDir(savedDir)
    if (savedAuto) setAutoSave(savedAuto === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('outputDir', outputDir)
    localStorage.setItem('autoSave', String(autoSave))
  }, [outputDir, autoSave])

  const handleSelectOutputDir = async () => {
    const path = await window.electronAPI.openDirectory()
    if (path) {
      setOutputDir(path)
    }
  }

  // TTS 配置状态
  const [ttsConfig, setTtsConfig] = useState({
    voice: 'zh-CN-XiaoxiaoNeural',
    rate: '+0%',
    pitch: '+0Hz',
    style: ''
  })

  // 字幕样式配置
  const [fontSize, setFontSize] = useState(12)
  const [bgVolume, setBgVolume] = useState(0.3)
  const [bgmPath, setBgmPath] = useState<string>('')

  // AI 音乐生成状态 (Tone.js)
  const [musicEmotion, setMusicEmotion] = useState<'宁静' | '欢快' | '悲伤' | '紧张' | '宏大'>('宁静')
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false)
  const [musicGenStatus, setMusicGenStatus] = useState('')
  const [musicPreviewUrl, setMusicPreviewUrl] = useState('')

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

  const pitchOptions = [
    { value: '-50Hz', label: '低沉 (-50Hz)' },
    { value: '-20Hz', label: '略低 (-20Hz)' },
    { value: '+0Hz', label: '正常' },
    { value: '+20Hz', label: '略高 (+20Hz)' },
    { value: '+50Hz', label: '高昂 (+50Hz)' },
  ]

  const styleOptions = [
    { value: '', label: '默认 (General)' },
    { value: 'cheerful', label: '开心 (Cheerful)' },
    { value: 'excited', label: '兴奋 (Excited)' },
    { value: 'sad', label: '悲伤 (Sad)' },
    { value: 'angry', label: '生气 (Angry)' },
    { value: 'fearful', label: '恐惧 (Fearful)' },
    { value: 'newscast', label: '新闻 (Newscast)' },
    { value: 'customerservice', label: '客服 (Customer Service)' },
    { value: 'assistant', label: '助手 (Assistant)' },
    { value: 'chat', label: '聊天 (Chat)' },
    { value: 'affectionate', label: '深情 (Affectionate)' },
    { value: 'calm', label: '冷静 (Calm)' },
    { value: 'disgruntled', label: '不满 (Disgruntled)' },
    { value: 'embarrassed', label: '尴尬 (Embarrassed)' },
    { value: 'gentle', label: '温柔 (Gentle)' },
    { value: 'lyrical', label: '抒情 (Lyrical)' },
    { value: 'serious', label: '严肃 (Serious)' },
    { value: 'sports-commentary', label: '体育解说 (Sports)' },
    { value: 'sports-commentary-excited', label: '激动体育 (Sports Excited)' },
  ]

  // 语音支持的风格映射
  // 注意：Edge TTS 免费接口可能随时调整支持的风格，目前测试发现 Xiaoxiao/Yunxi 等不再支持 style 参数 (报错 1007)
  const VOICE_STYLES: Record<string, string[]> = {
    'zh-CN-XiaoxiaoNeural': [], // 暂时移除风格支持，避免 1007 错误
    'zh-CN-YunxiNeural': [],    // 暂时移除风格支持
    'zh-CN-YunjianNeural': ['sports-commentary', 'sports-commentary-excited'],
    'zh-CN-XiaoyiNeural': ['angry', 'disgruntled', 'affectionate', 'cheerful', 'fearful', 'sad', 'embarrassed', 'serious', 'gentle'],
    'zh-CN-YunyangNeural': ['customerservice', 'newscast'],
    'zh-CN-XiaoshuangNeural': ['chat', 'cheerful', 'sad', 'angry'],
    'zh-CN-YunfengNeural': ['angry', 'cheerful', 'disgruntled', 'fearful', 'sad', 'serious'],
    'zh-HK-HiuGaaiNeural': [],
    'zh-TW-HsiaoChenNeural': []
  }

  // 计算当前语音可用的风格
  const currentStyles = styleOptions.filter(opt => {
    // 默认风格总是存在
    if (opt.value === '') return true
    const supported = VOICE_STYLES[ttsConfig.voice] || []
    return supported.includes(opt.value)
  })

  // 当语音切换时，如果当前风格不支持，则重置为默认
  useEffect(() => {
    const supported = VOICE_STYLES[ttsConfig.voice] || []
    if (ttsConfig.style && !supported.includes(ttsConfig.style)) {
      setTtsConfig(prev => ({ ...prev, style: '' }))
    }
  }, [ttsConfig.voice])

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
    const path = await window.electronAPI.openFileDialog({
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }]
    })
    if (path) {
      setVideoPath(path)
      addLog(`已选择视频：${path}`)
      // 重置状态
      setSegments([])
    }
  }

  const handleSelectBgm = async () => {
    const path = await window.electronAPI.openFileDialog({
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'flac'] }]
    })
    if (path) {
      setBgmPath(path)
      addLog(`已选择背景音乐：${path}`)
    }
  }

  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true)
    setMusicGenStatus('正在初始化音频引擎...')
    setMusicPreviewUrl('')
    
    try {
      setMusicGenStatus('正在加载乐器采样 (首次需要下载)...')
      await ToneGenerator.loadSamples()

      setMusicGenStatus('正在谱曲并渲染音频...')
      const duration = 30
      const wavBuffer = await ToneGenerator.generate({ emotion: musicEmotion, duration })

      const timestamp = new Date().toISOString().replace(/[-:.]/g, '')
      const fileName = `bgm_tonejs_${timestamp}.wav`

      setMusicGenStatus('正在保存...')

      const result = await window.electronAPI.saveFile(
        wavBuffer,
        fileName,
        outputDir,
        autoSave
      )

      if (result.status === 'success' && result.path) {
        setMusicGenStatus('生成成功！')
        const fileUrl = `local-media:///${encodeURIComponent(result.path)}`
        setMusicPreviewUrl(fileUrl)
        setBgmPath(result.path)
        addLog(`已自动应用生成的背景音乐：${result.path}`)
      } else if (result.status === 'canceled') {
        setMusicGenStatus('用户取消保存')
      } else {
        throw new Error(result.message || '保存失败')
      }
    } catch (error: any) {
      console.error(error)
      setMusicGenStatus(`错误: ${error.message}`)
      addLog(`音乐生成错误: ${error.message}`)
    } finally {
      setIsGeneratingMusic(false)
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
      const result = await window.electronAPI.exportVideo(videoPath, segments, withDubbing, ttsConfig, { fontSize }, outputDir, autoSave, bgVolume, bgmPath)
      if (result.status === 'success') {
        addLog(`${logPrefix}导出成功！保存路径：${result.outputPath}`)
        setPreviewFile(result.outputPath)
      } else if (result.status === 'copied') {
        addLog(`未找到 FFmpeg，已复制原视频到：${result.outputPath}`)
        setPreviewFile(result.outputPath)
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
      const result = await window.electronAPI.exportSrt(segments, outputDir, autoSave)
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

  const handleTtsGenerate = async (preview = false) => {
    if (segments.length === 0) {
      addLog('没有可用的字幕片段。')
      return
    }
    const fullText = segments.map(seg => seg.text).join('，') // 使用逗号连接，停顿更自然
    const logPrefix = preview ? '试听音频' : 'TTS 音频'
    addLog(`正在生成${logPrefix}...`)
    try {
      // 传递 preview 参数，如果为 true，主进程将跳过保存对话框并保存到临时文件
      const result = await window.electronAPI.generateAudio(fullText, { ...ttsConfig, preview }, preview, outputDir, autoSave)
      if (result.status === 'success') {
        addLog(`${logPrefix}生成成功！`)
        setPreviewFile(result.outputPath)
      } else if (result.status === 'canceled') {
        addLog(`用户取消${logPrefix}生成。`)
      } else if (result.status === 'error') {
        addLog(`${logPrefix}生成失败：${result.message}`)
      }
    } catch (error) {
      addLog(`${logPrefix}生成出错。`)
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
                    音调：
                    <select
                      value={ttsConfig.pitch}
                      onChange={e => setTtsConfig(prev => ({ ...prev, pitch: e.target.value }))}
                    >
                      {pitchOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    情感风格：
                    <select
                      value={ttsConfig.style}
                      onChange={e => setTtsConfig(prev => ({ ...prev, style: e.target.value }))}
                    >
                      {currentStyles.map(opt => (
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
                  <label style={{ display: 'flex', alignItems: 'center' }}>
                    背景音量：
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={bgVolume}
                      onChange={e => setBgVolume(parseFloat(e.target.value))}
                      style={{ width: '100px', margin: '0 5px' }}
                    />
                    <span>{Math.round(bgVolume * 100)}%</span>
                  </label>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 200 }}>
                    <button onClick={handleSelectBgm} style={{ whiteSpace: 'nowrap' }}>选择背景音乐</button>
                    <input 
                      type="text" 
                      value={bgmPath ? bgmPath.split('\\').pop() : '未选择 (使用原声)'} 
                      readOnly 
                      style={{ flex: 1, padding: '5px', fontSize: '12px', color: '#666' }} 
                      title={bgmPath}
                    />
                    {bgmPath && <button onClick={() => setBgmPath('')} style={{ padding: '5px 10px' }}>×</button>}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 15 }}>
                <h3>AI 音乐工坊 (轻量级算法生成)：</h3>
                <div className="control-group">
                  <label>情感基调：</label>
                  <div className="radio-group">
                    {['宁静', '欢快', '悲伤', '紧张', '宏大'].map(emo => (
                      <label key={emo} style={{ marginRight: '10px' }}>
                        <input 
                          type="radio" 
                          name="emotion" 
                          value={emo} 
                          checked={musicEmotion === emo} 
                          onChange={(e) => setMusicEmotion(e.target.value as typeof musicEmotion)}
                        /> {emo}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="control-group" style={{ marginTop: '10px' }}>
                  <button 
                    className="primary-btn full-width-btn" 
                    onClick={handleGenerateMusic}
                    disabled={isGeneratingMusic}
                    style={{ backgroundColor: '#ff9800' }}
                  >
                    {isGeneratingMusic ? '✨ 正在谱曲中...' : '🎵 生成古风 BGM (纯本地)'}
                  </button>
                  {musicGenStatus && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>{musicGenStatus}</span>}
                </div>

                {musicPreviewUrl && (
                  <div style={{ marginTop: '10px' }}>
                    <audio src={musicPreviewUrl} controls style={{ width: '100%' }} />
                  </div>
                )}
              </div>

              <div className="card" style={{ marginBottom: 15 }}>
                <h3>输出设置：</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="text"
                      value={outputDir}
                      placeholder="默认输出目录（留空则每次询问）"
                      readOnly
                      style={{ flex: 1, padding: '5px' }}
                    />
                    <button onClick={handleSelectOutputDir}>选择目录</button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={e => setAutoSave(e.target.checked)}
                    />
                    自动保存到该目录（不再询问）
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
                <button className="export-btn" onClick={() => handleTtsGenerate(false)} disabled={isExporting} style={{ marginLeft: 10, backgroundColor: '#0078d4' }}>
                    字幕转音频 (Edge TTS)
                </button>
                <button className="export-btn" onClick={() => handleTtsGenerate(true)} disabled={isExporting} style={{ marginLeft: 10, backgroundColor: '#FF5722' }}>
                    试听音频 (预览)
                </button>
              </div>
              
              {previewFile && (
                <div className="card" style={{ marginTop: '10px', border: '1px solid #4CAF50' }}>
                  <h3 style={{ color: '#4CAF50' }}>文件预览</h3>
                  <video 
                    src={`local-media:///${encodeURIComponent(previewFile)}`} 
                    controls 
                    className="video-player" 
                    style={{ maxHeight: '200px' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button onClick={() => window.electronAPI.openPath(previewFile)}>使用系统播放器播放</button>
                    <button onClick={() => window.electronAPI.showItemInFolder(previewFile)}>在文件夹中显示</button>
                    <button onClick={() => setPreviewFile(null)} style={{ backgroundColor: '#666' }}>关闭预览</button>
                  </div>
                </div>
              )}
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
