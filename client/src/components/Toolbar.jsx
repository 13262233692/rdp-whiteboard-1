function Toolbar({ 
  tool, 
  setTool, 
  color, 
  setColor, 
  brushSize, 
  setBrushSize,
  isWhiteboardActive,
  onToggleWhiteboard,
  onClearCanvas
}) {
  const tools = [
    { id: 'pen', icon: '✏️', label: '画笔' },
    { id: 'eraser', icon: '🧹', label: '橡皮擦' },
  ];

  const colors = [
    '#e94560', '#ffffff', '#4ade80', '#60a5fa', '#fbbf24', '#a78bfa'
  ];

  return (
    <div className="toolbar">
      <button
        className={`tool-btn ${isWhiteboardActive ? 'active' : ''}`}
        onClick={onToggleWhiteboard}
        title="切换白板"
      >
        🖊️
      </button>
      
      <div className="divider" />
      
      {tools.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool === t.id && isWhiteboardActive ? 'active' : ''}`}
          onClick={() => setTool(t.id)}
          disabled={!isWhiteboardActive}
          title={t.label}
        >
          {t.icon}
        </button>
      ))}
      
      <div className="divider" />
      
      <input
        type="color"
        className="color-picker"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="选择颜色"
        disabled={!isWhiteboardActive}
      />
      
      {colors.map((c) => (
        <button
          key={c}
          className="tool-btn"
          onClick={() => setColor(c)}
          disabled={!isWhiteboardActive}
          style={{ 
            background: c,
            border: color === c ? '2px solid #fff' : 'none',
            opacity: isWhiteboardActive ? 1 : 0.5
          }}
          title={c}
        />
      ))}
      
      <div className="divider" />
      
      <input
        type="number"
        className="brush-size"
        value={brushSize}
        onChange={(e) => setBrushSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 2)))}
        min="1"
        max="50"
        title="画笔大小"
        disabled={!isWhiteboardActive}
      />
      
      <div className="divider" />
      
      <button
        className="tool-btn"
        onClick={onClearCanvas}
        title="清空画布"
        disabled={!isWhiteboardActive}
      >
        🗑️
      </button>
    </div>
  );
}

export default Toolbar;
