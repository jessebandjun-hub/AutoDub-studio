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
  const handleExport = async () => {
    if (!videoPath || segments.length === 0) return
    setIsExporting(true)
    addLog('开始导出... 请先选择保存位置。')

    try {
      // 调用主进程进行导出，传入原视频路径和当前的字幕数据
      const result = await window.electronAPI.exportVideo(videoPath, segments)
      if (result.status === 'success') {
        addLog(`导出成功！保存路径：${result.outputPath}`)
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

  return (
    <div className="container">
      <h1>AutoDub Studio</h1>
      
      <div className="card">
        {videoPath ? (
          <>
            <video className="video-player" src={videoUrl} controls ref={videoRef} />
            <p className="path-display">当前：{videoPath}</p>
            <button onClick={handleSelectFile} disabled={isProcessing || isExporting}>更换视频</button>
          </>
        ) : (
          <button onClick={handleSelectFile} disabled={isProcessing || isExporting}>选择视频文件</button>
        )}
      </div>

      {videoPath && (
        <div className="card">
           <button onClick={handleProcess} disabled={isProcessing || segments.length > 0}>
            {isProcessing ? '处理中...' : '开始 AI 分析（模拟）'}
          </button>
        </div>
      )}

      {segments.length > 0 && (
        <div className="timeline-mock">
          <h3>字幕时间线预览：</h3>
          <div className="card action-card">
            <button onClick={() => setEditing(e => !e)}>
              {editing ? '完成编辑' : '编辑字幕'}
            </button>
            {editing && (
              <button
                style={{ marginLeft: 8 }}
                onClick={() => {
                  const t = videoRef.current?.currentTime ?? 0
                  const nextId = (segments.reduce((m, s) => Math.max(m, s.id), 0) || 0) + 1
                  const newSeg: SubtitleSegment = { id: nextId, start: parseFloat(t.toFixed(2)), end: parseFloat((t + 1).toFixed(2)), text: '' }
                  setSegments(prev => [...prev, newSeg])
                }}
              >
                添加片段
              </button>
            )}
          </div>
          <ul>
            {segments.map(seg => (
              <li key={seg.id}>[{seg.start}s - {seg.end}s]: {seg.text}</li>
            ))}
          </ul>
          {editing && (
            <div className="editor">
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
          )}
          <div className="card action-card">
            <button className="export-btn" onClick={handleExport} disabled={isExporting}>
                {isExporting ? '导出中...' : '导出视频（烧录字幕）'}
            </button>
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
