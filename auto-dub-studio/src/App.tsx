import { useEffect, useRef, useState } from 'react'
import './App.css'
import VideoPanel from './VideoPanel'
import SubtitleTab from './SubtitleTab'
import ConcatTab from './ConcatTab'

// 模拟的字幕数据类型
type SubtitleSegment = { id: number; start: number; end: number; text: string; }
type ConcatItem = { id: number; path: string; transitionAfter: 'none' | 'crossfade' }

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
  const [activeTab, setActiveTab] = useState<'subtitle' | 'concat'>('subtitle')

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
  const [concatList, setConcatList] = useState<ConcatItem[]>([])
  const [isConcating, setIsConcating] = useState(false)
  const [trimStart, setTrimStart] = useState('0')
  const [trimEnd, setTrimEnd] = useState('0')
  const [isTrimming, setIsTrimming] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const trimBarRef = useRef<HTMLDivElement | null>(null)
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null)
  const [draggingConcatId, setDraggingConcatId] = useState<number | null>(null)

  const safeDuration = videoDuration > 0 ? videoDuration : 0
  const trimStartNum = parseFloat(trimStart) || 0
  const trimEndNum = parseFloat(trimEnd) || 0
  const clippedStart = safeDuration > 0 ? Math.min(Math.max(trimStartNum, 0), safeDuration) : 0
  const clippedEnd = safeDuration > 0 ? Math.min(Math.max(trimEndNum, 0), safeDuration) : 0
  const rangeStartRatio = safeDuration > 0 ? (clippedStart / safeDuration) * 100 : 0
  const rangeEndRatio = safeDuration > 0 ? (clippedEnd / safeDuration) * 100 : 0

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

  useEffect(() => {
    if (!videoPath) {
      setVideoDuration(0)
      setTrimStart('0')
      setTrimEnd('0')
    }
  }, [videoPath])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const handleLoaded = () => {
      const d = el.duration || 0
      setVideoDuration(d)
      setTrimStart('0')
      setTrimEnd(d > 0 ? d.toFixed(2) : '0')
    }
    el.addEventListener('loadedmetadata', handleLoaded)
    if (el.readyState >= 1) {
      handleLoaded()
    }
    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded)
    }
  }, [videoPath])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingHandle || !trimBarRef.current || videoDuration <= 0) return
      const rect = trimBarRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.min(1, Math.max(0, x / rect.width))
      const time = parseFloat((ratio * videoDuration).toFixed(2))
      if (draggingHandle === 'start') {
        const endNum = parseFloat(trimEnd) || 0
        const value = Math.min(time, endNum)
        setTrimStart(value.toString())
      } else {
        const startNum = parseFloat(trimStart) || 0
        const value = Math.max(time, startNum)
        setTrimEnd(value.toString())
      }
    }
    const handleUp = () => {
      setDraggingHandle(null)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [draggingHandle, videoDuration, trimStart, trimEnd])

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
      setTrimStart('0')
      setTrimEnd('0')
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

  const handleTrimVideo = async () => {
    if (!videoPath) {
      addLog('请先选择要剪辑的视频。')
      return
    }
    const maxDuration = videoDuration || videoRef.current?.duration || 0
    const startRaw = parseFloat(trimStart)
    const endRaw = parseFloat(trimEnd)
    if (isNaN(startRaw) || isNaN(endRaw)) {
      addLog('剪辑时间无效，请检查开始和结束时间。')
      return
    }
    const start = Math.max(0, Math.min(startRaw, maxDuration))
    const end = Math.max(0, Math.min(endRaw, maxDuration))
    if (end <= start || maxDuration <= 0) {
      addLog('剪辑时间无效，请检查开始和结束时间。')
      return
    }
    setIsTrimming(true)
    addLog(`开始剪辑视频：${start}s ~ ${end}s`)
    try {
      const result = await window.electronAPI.trimVideo(videoPath, { start, end, outputDir, autoSave })
      if (result.status === 'success') {
        addLog(`剪辑完成，保存路径：${result.outputPath}`)
        setPreviewFile(result.outputPath)
      } else if (result.status === 'canceled') {
        addLog('用户取消剪辑保存。')
      } else if (result.status === 'error') {
        addLog(`剪辑失败：${result.message || '未知错误'}`)
      }
    } catch {
      addLog('剪辑过程中出错。')
    } finally {
      setIsTrimming(false)
    }
  }

  const handleAddConcatVideo = async () => {
    const path = await window.electronAPI.openFileDialog({
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
    })
    if (path) {
      setConcatList(prev => {
        const nextId = (prev.reduce((m, item) => (item.id > m ? item.id : m), 0) || 0) + 1
        return [...prev, { id: nextId, path, transitionAfter: 'none' }]
      })
    }
  }

  const handleConcatVideos = async () => {
    if (concatList.length < 2) {
      addLog('请至少添加两个视频再进行拼接。')
      return
    }
    setIsConcating(true)
    addLog(`开始拼接 ${concatList.length} 个视频。`)
    try {
      const result = await window.electronAPI.concatVideos(
        concatList.map(item => item.path),
        { outputDir, autoSave }
      )
      if (result.status === 'success') {
        addLog(`拼接完成，保存路径：${result.outputPath}`)
        setPreviewFile(result.outputPath)
      } else if (result.status === 'canceled') {
        addLog('用户取消拼接保存。')
      } else if (result.status === 'error') {
        addLog(`拼接失败：${result.message || '未知错误'}`)
      }
    } catch {
      addLog('拼接过程中出错。')
    } finally {
      setIsConcating(false)
    }
  }

  const handleConcatReorder = (targetId: number) => {
    if (draggingConcatId == null || draggingConcatId === targetId) return
    setConcatList(prev => {
      const currentIndex = prev.findIndex(item => item.id === draggingConcatId)
      const targetIndex = prev.findIndex(item => item.id === targetId)
      if (currentIndex === -1 || targetIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
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
          <VideoPanel
            videoPath={videoPath}
            videoUrl={videoUrl}
            videoRef={videoRef}
            safeDuration={safeDuration}
            clippedStart={clippedStart}
            clippedEnd={clippedEnd}
            rangeStartRatio={rangeStartRatio}
            rangeEndRatio={rangeEndRatio}
            trimStart={trimStart}
            trimEnd={trimEnd}
            isTrimming={isTrimming}
            isExporting={isExporting}
            isProcessing={isProcessing}
            onTrimStartChange={setTrimStart}
            onTrimEndChange={setTrimEnd}
            onSetDraggingHandle={setDraggingHandle}
            onTrimVideo={handleTrimVideo}
            onSelectFile={handleSelectFile}
            trimBarRef={trimBarRef}
          />
          <div className="right-panel">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setActiveTab('subtitle')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: activeTab === 'subtitle' ? '1px solid #646cff' : '1px solid #444',
                  background: activeTab === 'subtitle' ? '#2a2a4a' : '#1f1f1f',
                  color: activeTab === 'subtitle' ? '#fff' : '#aaa',
                  cursor: 'pointer',
                }}
              >
                字幕配音
              </button>
              <button
                onClick={() => setActiveTab('concat')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: activeTab === 'concat' ? '1px solid #646cff' : '1px solid #444',
                  background: activeTab === 'concat' ? '#2a2a4a' : '#1f1f1f',
                  color: activeTab === 'concat' ? '#fff' : '#aaa',
                  cursor: 'pointer',
                }}
              >
                视频拼接
              </button>
            </div>

            {activeTab === 'subtitle' && (
              <SubtitleTab
                segments={segments}
                setSegments={setSegments}
                videoRef={videoRef}
                ttsConfig={ttsConfig}
                setTtsConfig={setTtsConfig}
                voiceOptions={voiceOptions}
                rateOptions={rateOptions}
                pitchOptions={pitchOptions}
                currentStyles={currentStyles}
                fontSize={fontSize}
                setFontSize={setFontSize}
                bgVolume={bgVolume}
                setBgVolume={setBgVolume}
                bgmPath={bgmPath}
                onSelectBgm={handleSelectBgm}
                onClearBgm={() => setBgmPath('')}
                outputDir={outputDir}
                autoSave={autoSave}
                setAutoSave={setAutoSave}
                onSelectOutputDir={handleSelectOutputDir}
                isExporting={isExporting}
                onExportWithDubbing={() => handleExport(true)}
                onExportSrt={handleExportSrt}
                onGenerateTts={handleTtsGenerate}
                previewFile={previewFile}
                onClosePreview={() => setPreviewFile(null)}
                onEditingChange={setEditing}
              />
            )}

            {activeTab === 'concat' && (
              <ConcatTab
                concatList={concatList}
                isConcating={isConcating}
                isExporting={isExporting}
                onAddVideo={handleAddConcatVideo}
                onConcat={handleConcatVideos}
                draggingConcatId={draggingConcatId}
                onSetDraggingConcatId={setDraggingConcatId}
                onReorder={handleConcatReorder}
                onRemove={id => setConcatList(prev => prev.filter(c => c.id !== id))}
                onChangeTransition={(id, value) =>
                  setConcatList(prev =>
                    prev.map(c =>
                      c.id === id ? { ...c, transitionAfter: value } : c
                    )
                  )
                }
              />
            )}
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
