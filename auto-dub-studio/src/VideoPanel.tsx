import { RefObject } from 'react'

type VideoPanelProps = {
  videoPath: string | null
  videoUrl: string
  videoRef: RefObject<HTMLVideoElement>
  safeDuration: number
  clippedStart: number
  clippedEnd: number
  rangeStartRatio: number
  rangeEndRatio: number
  trimStart: string
  trimEnd: string
  isTrimming: boolean
  isExporting: boolean
  isProcessing: boolean
  onTrimStartChange: (value: string) => void
  onTrimEndChange: (value: string) => void
  onSetDraggingHandle: (handle: 'start' | 'end' | null) => void
  onTrimVideo: () => void
  onSelectFile: () => void
  trimBarRef: RefObject<HTMLDivElement>
}

function VideoPanel({
  videoPath,
  videoUrl,
  videoRef,
  safeDuration,
  clippedStart,
  clippedEnd,
  rangeStartRatio,
  rangeEndRatio,
  trimStart,
  trimEnd,
  isTrimming,
  isExporting,
  isProcessing,
  onTrimStartChange,
  onTrimEndChange,
  onSetDraggingHandle,
  onTrimVideo,
  onSelectFile,
  trimBarRef,
}: VideoPanelProps) {
  return (
    <div className="left-panel">
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#000', border: '1px solid #333' }}>
        <div style={{ position: 'relative', flex: 1, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <video className="video-player" src={videoUrl} controls ref={videoRef} style={{ width: '100%', maxHeight: '500px', outline: 'none' }} />
        </div>

        <div style={{ background: '#1a1a1a', padding: '12px 16px', borderTop: '1px solid #333' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 'bold', color: '#eee' }}>剪辑范围</span>
              <span style={{ background: '#333', padding: '2px 6px', borderRadius: 4 }}>
                {(parseFloat(trimEnd) - parseFloat(trimStart)).toFixed(2)}s
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              总时长: {safeDuration.toFixed(2)}s
            </div>
          </div>

          <div style={{ position: 'relative', height: 40, marginBottom: 8, display: 'flex', alignItems: 'center' }}>
            <div
              ref={trimBarRef}
              style={{
                flex: 1,
                height: 24,
                position: 'relative',
                background: '#0a0a0a',
                borderRadius: 4,
                cursor: safeDuration > 0 ? 'pointer' : 'not-allowed',
                border: '1px solid #333',
              }}
              onMouseDown={e => {
                if (!trimBarRef.current || safeDuration <= 0) return
                const rect = trimBarRef.current.getBoundingClientRect()
                const x = e.clientX - rect.left
                const ratio = Math.min(1, Math.max(0, x / rect.width))
                const t = parseFloat((ratio * safeDuration).toFixed(2))
                const mid = (clippedStart + clippedEnd) / 2
                if (t <= mid) {
                  onSetDraggingHandle('start')
                  const v = Math.min(t, clippedEnd)
                  onTrimStartChange(v.toString())
                } else {
                  onSetDraggingHandle('end')
                  const v = Math.max(t, clippedStart)
                  onTrimEndChange(v.toString())
                }
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${rangeStartRatio}%`,
                  right: `${100 - rangeEndRatio}%`,
                  top: 0,
                  bottom: 0,
                  background: 'rgba(76, 175, 80, 0.2)',
                  borderLeft: '2px solid #4caf50',
                  borderRight: '2px solid #4caf50',
                  pointerEvents: 'none',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  left: `${rangeStartRatio}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 28,
                  background: '#e0e0e0',
                  borderRadius: 2,
                  cursor: 'ew-resize',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseDown={e => {
                  e.stopPropagation()
                  if (safeDuration <= 0) return
                  onSetDraggingHandle('start')
                }}
              >
                <div style={{ width: 2, height: 12, background: '#888' }} />
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: `${rangeEndRatio}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 28,
                  background: '#e0e0e0',
                  borderRadius: 2,
                  cursor: 'ew-resize',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseDown={e => {
                  e.stopPropagation()
                  if (safeDuration <= 0) return
                  onSetDraggingHandle('end')
                }}
              >
                <div style={{ width: 2, height: 12, background: '#888' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input
                type="number"
                value={trimStart}
                onChange={e => onTrimStartChange(e.target.value)}
                style={{ width: 60, padding: '4px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: 4, fontSize: 12 }}
                min="0"
              />
              <span style={{ color: '#666' }}>-</span>
              <input
                type="number"
                value={trimEnd}
                onChange={e => onTrimEndChange(e.target.value)}
                style={{ width: 60, padding: '4px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: 4, fontSize: 12 }}
                min="0"
              />
            </div>

            <button
              className="export-btn"
              onClick={onTrimVideo}
              disabled={isTrimming || isExporting}
              style={{ padding: '6px 12px', fontSize: 12, height: 'fit-content' }}
            >
              {isTrimming ? '剪辑中...' : '导出片段'}
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 16px', background: '#222', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="path-display" style={{ margin: 0, fontSize: 12, color: '#888', wordBreak: 'break-all' }}>当前：{videoPath}</p>
          <button onClick={onSelectFile} disabled={isProcessing || isExporting} style={{ width: '100%' }}>更换视频</button>
        </div>
      </div>
    </div>
  )
}

export default VideoPanel
