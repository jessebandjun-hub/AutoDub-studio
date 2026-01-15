type ConcatItem = { id: number; path: string; transitionAfter: 'none' | 'crossfade' }

type ConcatTabProps = {
  concatList: ConcatItem[]
  isConcating: boolean
  isExporting: boolean
  onAddVideo: () => void
  onConcat: () => void
  draggingConcatId: number | null
  onSetDraggingConcatId: (id: number | null) => void
  onReorder: (targetId: number) => void
  onRemove: (id: number) => void
  onChangeTransition: (id: number, transition: ConcatItem['transitionAfter']) => void
}

function ConcatTab({
  concatList,
  isConcating,
  isExporting,
  onAddVideo,
  onConcat,
  draggingConcatId,
  onSetDraggingConcatId,
  onReorder,
  onRemove,
  onChangeTransition,
}: ConcatTabProps) {
  return (
    <div className="card">
      <h3>多视频拼接：</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={onAddVideo} disabled={isConcating || isExporting}>
          添加视频到拼接列表
        </button>
        <button
          className="export-btn"
          onClick={onConcat}
          disabled={isConcating || concatList.length < 2 || isExporting}
          style={{ backgroundColor: '#4caf50' }}
        >
          {isConcating ? '拼接中...' : '开始拼接导出'}
        </button>
        {concatList.length > 0 && (
          <span style={{ fontSize: 12, color: '#aaa' }}>
            当前片段：{concatList.length} 个，将按顺序拼接
          </span>
        )}
      </div>

      {concatList.length === 0 && (
        <p style={{ fontSize: 12, color: '#888' }}>请先添加至少两个视频，支持拖拽调整顺序和设置转场。</p>
      )}

      {concatList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {concatList.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => onSetDraggingConcatId(item.id)}
              onDragOver={e => {
                e.preventDefault()
              }}
              onDrop={e => {
                e.preventDefault()
                onReorder(item.id)
                onSetDraggingConcatId(null)
              }}
              onDragEnd={() => onSetDraggingConcatId(null)}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #444',
                background: draggingConcatId === item.id ? '#333' : '#222',
                cursor: 'move',
              }}
            >
              <div style={{ width: 20, textAlign: 'center', color: '#888', fontSize: 12 }}>≡</div>
              <div style={{ width: 140 }}>
                <video
                  src={`local-media:///${encodeURIComponent(item.path)}`}
                  className="video-player"
                  style={{ width: '100%', maxHeight: 80, borderRadius: 4 }}
                  muted
                  controls
                />
              </div>
              <div style={{ flex: 1, fontSize: 12 }}>
                <div style={{ marginBottom: 4, color: '#fff' }}>
                  {item.path.split('\\').pop()}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#aaa' }}>顺序: {idx + 1}</span>
                  <span style={{ color: '#666' }}>转场:</span>
                  <select
                    value={item.transitionAfter}
                    onChange={e => {
                      const value = e.target.value as ConcatItem['transitionAfter']
                      onChangeTransition(item.id, value)
                    }}
                    style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}
                  >
                    <option value="none">无转场</option>
                    <option value="crossfade">交叉淡入淡出（预留）</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ConcatTab
