import { Dispatch, RefObject, SetStateAction } from 'react'

type SubtitleSegment = { id: number; start: number; end: number; text: string }

type Option = { value: string; label: string }

type TtsConfig = {
  voice: string
  rate: string
  pitch: string
  style: string
}

type SubtitleTabProps = {
  segments: SubtitleSegment[]
  setSegments: Dispatch<SetStateAction<SubtitleSegment[]>>
  videoRef: RefObject<HTMLVideoElement>
  ttsConfig: TtsConfig
  setTtsConfig: Dispatch<SetStateAction<TtsConfig>>
  voiceOptions: Option[]
  rateOptions: Option[]
  pitchOptions: Option[]
  currentStyles: Option[]
  fontSize: number
  setFontSize: (v: number) => void
  bgVolume: number
  setBgVolume: (v: number) => void
  bgmPath: string
  onSelectBgm: () => void
  onClearBgm: () => void
  outputDir: string
  autoSave: boolean
  setAutoSave: (v: boolean) => void
  onSelectOutputDir: () => void
  isExporting: boolean
  onExportWithDubbing: () => void
  onExportSrt: () => void
  onGenerateTts: (preview: boolean) => void
  previewFile: string | null
  onClosePreview: () => void
  onEditingChange: (editing: boolean) => void
}

function SubtitleTab({
  segments,
  setSegments,
  videoRef,
  ttsConfig,
  setTtsConfig,
  voiceOptions,
  rateOptions,
  pitchOptions,
  currentStyles,
  fontSize,
  setFontSize,
  bgVolume,
  setBgVolume,
  bgmPath,
  onSelectBgm,
  onClearBgm,
  outputDir,
  autoSave,
  setAutoSave,
  onSelectOutputDir,
  isExporting,
  onExportWithDubbing,
  onExportSrt,
  onGenerateTts,
  previewFile,
  onClosePreview,
  onEditingChange,
}: SubtitleTabProps) {
  return (
    <>
      <div className="timeline-mock">
        <h3>字幕编辑：</h3>
        <div className="card action-card">
          <button
            onClick={() => {
              const t = videoRef.current?.currentTime ?? 0
              const nextId = (segments.reduce((m, s) => Math.max(m, s.id), 0) || 0) + 1
              const newSeg: SubtitleSegment = { id: nextId, start: parseFloat(t.toFixed(2)), end: parseFloat((t + 2).toFixed(2)), text: '新字幕片段' }
              setSegments(prev => [...prev, newSeg])
              onEditingChange(true)
            }}
          >
            + 添加字幕片段 (在当前时间)
          </button>
        </div>

        <div className="editor">
          {segments.length === 0 && <p style={{ color: '#888' }}>暂无字幕，请点击上方按钮添加。</p>}
          {segments.map(seg => (
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
      </div>

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
            <button onClick={onSelectBgm} style={{ whiteSpace: 'nowrap' }}>选择背景音乐</button>
            <input
              type="text"
              value={bgmPath ? bgmPath.split('\\').pop() : '未选择 (使用原声)'}
              readOnly
              style={{ flex: 1, padding: '5px', fontSize: '12px', color: '#666' }}
              title={bgmPath}
            />
            {bgmPath && <button onClick={onClearBgm} style={{ padding: '5px 10px' }}>×</button>}
          </div>
        </div>
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
            <button onClick={onSelectOutputDir}>选择目录</button>
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
        <button
          className="export-btn"
          onClick={onExportWithDubbing}
          disabled={isExporting || segments.length === 0}
          style={{ marginLeft: 10, backgroundColor: '#8a2be2' }}
        >
          导出配音视频 (TTS+字幕)
        </button>
        <button
          className="export-btn"
          onClick={onExportSrt}
          disabled={isExporting || segments.length === 0}
          style={{ marginLeft: 10 }}
        >
          导出 SRT 字幕文件
        </button>
        <button
          className="export-btn"
          onClick={() => onGenerateTts(false)}
          disabled={isExporting || segments.length === 0}
          style={{ marginLeft: 10, backgroundColor: '#0078d4' }}
        >
          字幕转音频 (Edge TTS)
        </button>
        <button
          className="export-btn"
          onClick={() => onGenerateTts(true)}
          disabled={isExporting || segments.length === 0}
          style={{ marginLeft: 10, backgroundColor: '#FF5722' }}
        >
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
            <button onClick={onClosePreview} style={{ backgroundColor: '#666' }}>关闭预览</button>
          </div>
        </div>
      )}
    </>
  )
}

export default SubtitleTab
