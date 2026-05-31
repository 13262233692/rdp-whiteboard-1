import { useState, useMemo } from 'react';
import { downloadSVG, downloadJSON } from '../utils/exportUtils.js';

function LayerManager({ strokes, onToggleStroke, onDeleteStroke, onClearAll }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterUser, setFilterUser] = useState('all');

  const groupedStrokes = useMemo(() => {
    const grouped = {};
    strokes.forEach(stroke => {
      const userId = stroke.userId || 'unknown';
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push(stroke);
    });
    return grouped;
  }, [strokes]);

  const allUsers = useMemo(() => {
    return Object.keys(groupedStrokes);
  }, [groupedStrokes]);

  const filteredStrokes = useMemo(() => {
    if (filterUser === 'all') {
      return strokes;
    }
    return groupedStrokes[filterUser] || [];
  }, [strokes, filterUser, groupedStrokes]);

  const handleExportSVG = () => {
    const visibleStrokes = strokes.filter(s => !s.hidden);
    downloadSVG(visibleStrokes, `annotations_${Date.now()}.svg`);
  };

  const handleExportJSON = () => {
    downloadJSON(strokes, `annotations_${Date.now()}.json`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(parseInt(timestamp.split('_')[1]) || Date.now());
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const visibleCount = strokes.filter(s => !s.hidden).length;

  return (
    <div className="layer-manager">
      <div 
        className="layer-manager-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        <h3 className="layer-manager-title">标注图层</h3>
        <span className="stroke-count">
          {visibleCount}/{strokes.length} 可见
        </span>
      </div>

      {isExpanded && (
        <>
          <div className="layer-manager-actions">
            <button 
              className="btn btn-small btn-secondary"
              onClick={handleExportSVG}
              disabled={strokes.length === 0}
            >
              📄 导出SVG
            </button>
            <button 
              className="btn btn-small btn-secondary"
              onClick={handleExportJSON}
              disabled={strokes.length === 0}
            >
              💾 导出JSON
            </button>
            <button 
              className="btn btn-small btn-danger"
              onClick={onClearAll}
              disabled={strokes.length === 0}
            >
              🗑️ 清空
            </button>
          </div>

          {allUsers.length > 1 && (
            <div className="layer-filter">
              <select 
                value={filterUser} 
                onChange={(e) => setFilterUser(e.target.value)}
                className="filter-select"
              >
                <option value="all">全部用户</option>
                {allUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          )}

          <div className="layer-list">
            {filteredStrokes.length === 0 ? (
              <div className="empty-layers">
                {strokes.length === 0 ? '暂无标注' : '没有匹配的标注'}
              </div>
            ) : (
              filteredStrokes.slice().reverse().map((stroke, index) => (
                <div 
                  key={stroke.strokeId || index}
                  className={`layer-item ${stroke.hidden ? 'hidden' : ''}`}
                >
                  <button
                    className="layer-toggle"
                    onClick={() => onToggleStroke(stroke.strokeId)}
                    title={stroke.hidden ? '显示' : '隐藏'}
                  >
                    {stroke.hidden ? '👁️‍🗨️' : '👁️'}
                  </button>
                  <div 
                    className="layer-color"
                    style={{ backgroundColor: stroke.color || '#ffffff' }}
                  />
                  <div className="layer-info">
                    <div className="layer-user">{stroke.userId || 'unknown'}</div>
                    <div className="layer-time">{formatTime(stroke.strokeId || '')}</div>
                  </div>
                  <div className="layer-size" title="画笔大小">
                    {stroke.brushSize || 2}px
                  </div>
                  <button
                    className="layer-delete"
                    onClick={() => onDeleteStroke(stroke.strokeId)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default LayerManager;
