import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Whiteboard from '../components/Whiteboard.jsx';
import Toolbar from '../components/Toolbar.jsx';
import RemoteDesktop from '../components/RemoteDesktop.jsx';
import LayerManager from '../components/LayerManager.jsx';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/exportUtils.js';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [users, setUsers] = useState([]);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#e94560');
  const [brushSize, setBrushSize] = useState(4);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(true);
  const [drawData, setDrawData] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [vncStatus, setVncStatus] = useState('disconnected');
  const [socketConnected, setSocketConnected] = useState(false);
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const [vncDisplayRect, setVncDisplayRect] = useState({
    offsetX: 0,
    offsetY: 0,
    width: 800,
    height: 600,
    scale: 1,
    containerWidth: 800,
    containerHeight: 600
  });

  const socketRef = useRef(null);
  const drawHistoryRef = useRef([]);
  const remoteDesktopRef = useRef(null);
  const isReconnectingRef = useRef(false);

  const normalizeLegacyData = useCallback((data) => {
    if (!data) return [];
    return data.map(item => {
      if (item.points && item.points.length > 0 && item.points[0].nx === undefined) {
        return {
          ...item,
          strokeId: item.strokeId || 'legacy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          hidden: item.hidden || false,
          points: item.points.map(p => ({
            nx: vncDisplayRect.width > 0 ? (p.x - vncDisplayRect.offsetX) / vncDisplayRect.width : 0.5,
            ny: vncDisplayRect.height > 0 ? (p.y - vncDisplayRect.offsetY) / vncDisplayRect.height : 0.5
          }))
        };
      }
      return {
        ...item,
        strokeId: item.strokeId || 'legacy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        hidden: item.hidden || false
      };
    });
  }, [vncDisplayRect]);

  const mergeStrokes = useCallback((serverStrokes, localStrokes) => {
    const merged = new Map();
    
    serverStrokes.forEach(stroke => {
      if (stroke.strokeId) {
        merged.set(stroke.strokeId, stroke);
      }
    });
    
    localStrokes.forEach(stroke => {
      if (stroke.strokeId && !merged.has(stroke.strokeId)) {
        merged.set(stroke.strokeId, stroke);
      }
    });
    
    return Array.from(merged.values());
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (!storedName) {
      navigate('/');
      return;
    }
    setUserName(storedName);

    const localData = loadFromLocalStorage(roomId);
    if (localData.length > 0) {
      const normalizedLocal = normalizeLegacyData(localData);
      drawHistoryRef.current = normalizedLocal;
      setDrawData(normalizedLocal);
      isReconnectingRef.current = true;
    }

    const socket = io('http://localhost:3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setSocketConnected(true);
      socket.emit('join-room', roomId, storedName);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setSocketConnected(false);
    });

    socket.on('reconnect', () => {
      console.log('Reconnected to signaling server');
      setSocketConnected(true);
    });

    socket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      setUsers(data.users);
      
      const serverStrokes = normalizeLegacyData(data.whiteboardData || []);
      
      if (isReconnectingRef.current) {
        const merged = mergeStrokes(serverStrokes, drawHistoryRef.current);
        drawHistoryRef.current = merged;
        setDrawData(merged);
        isReconnectingRef.current = false;
        console.log('Reconnected: merged local and server strokes');
      } else {
        drawHistoryRef.current = serverStrokes;
        setDrawData(serverStrokes);
      }
      
      saveToLocalStorage(roomId, drawHistoryRef.current);
    });

    socket.on('user-joined', (data) => {
      console.log('User joined:', data);
      setUsers(prev => [...new Set([...prev, data.userId])]);
    });

    socket.on('user-left', (data) => {
      console.log('User left:', data);
      setUsers(prev => prev.filter(u => u !== data.userId));
      setRemoteCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[data.userId];
        return newCursors;
      });
    });

    socket.on('draw', (data) => {
      if (data.userId !== userName) {
        const normalized = normalizeLegacyData([data]);
        drawHistoryRef.current.push(normalized[0]);
        setDrawData([...drawHistoryRef.current]);
        saveToLocalStorage(roomId, drawHistoryRef.current);
      }
    });

    socket.on('delete-stroke', (data) => {
      drawHistoryRef.current = drawHistoryRef.current.filter(s => s.strokeId !== data.strokeId);
      setDrawData([...drawHistoryRef.current]);
      saveToLocalStorage(roomId, drawHistoryRef.current);
    });

    socket.on('cursor-move', (data) => {
      if (data.userId !== userName) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.userId]: { nx: data.nx, ny: data.ny }
        }));
      }
    });

    socket.on('clear-canvas', () => {
      drawHistoryRef.current = [];
      setDrawData([]);
      saveToLocalStorage(roomId, []);
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.close();
    };
  }, [roomId, navigate, userName, normalizeLegacyData, mergeStrokes]);

  const handleDrawStart = useCallback((stroke) => {
  }, []);

  const handleDrawMove = useCallback((stroke) => {
    if (socketRef.current) {
      socketRef.current.emit('draw-move', {
        ...stroke,
        roomId
      });
    }
  }, [roomId]);

  const handleDrawEnd = useCallback((stroke) => {
    if (socketRef.current && stroke.points.length > 1) {
      const drawEvent = {
        ...stroke,
        roomId
      };
      socketRef.current.emit('draw', drawEvent);
      drawHistoryRef.current.push(drawEvent);
      setDrawData([...drawHistoryRef.current]);
      saveToLocalStorage(roomId, drawHistoryRef.current);
    }
  }, [roomId]);

  const handleCursorMove = useCallback((data) => {
    if (socketRef.current) {
      socketRef.current.emit('cursor-move', {
        ...data,
        roomId,
        userId: userName
      });
    }
  }, [roomId, userName]);

  const handleClearCanvas = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('clear-canvas', roomId);
      drawHistoryRef.current = [];
      setDrawData([]);
      saveToLocalStorage(roomId, []);
    }
  }, [roomId]);

  const handleToggleStroke = useCallback((strokeId) => {
    drawHistoryRef.current = drawHistoryRef.current.map(s => 
      s.strokeId === strokeId ? { ...s, hidden: !s.hidden } : s
    );
    setDrawData([...drawHistoryRef.current]);
    saveToLocalStorage(roomId, drawHistoryRef.current);
  }, [roomId]);

  const handleDeleteStroke = useCallback((strokeId) => {
    if (socketRef.current) {
      socketRef.current.emit('delete-stroke', { roomId, strokeId });
      drawHistoryRef.current = drawHistoryRef.current.filter(s => s.strokeId !== strokeId);
      setDrawData([...drawHistoryRef.current]);
      saveToLocalStorage(roomId, drawHistoryRef.current);
    }
  }, [roomId]);

  const handleToggleWhiteboard = () => {
    setIsWhiteboardActive(prev => !prev);
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
    }
    navigate('/');
  };

  const handleVncStatusChange = useCallback((status) => {
    setVncStatus(status);
    requestAnimationFrame(() => {
      setRedrawTrigger(prev => prev + 1);
    });
  }, []);

  const handleDisplayRectChange = useCallback((newRect) => {
    setVncDisplayRect(newRect);
    requestAnimationFrame(() => {
      setRedrawTrigger(prev => prev + 1);
    });
  }, []);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('房间号已复制到剪贴板');
  };

  return (
    <div className="room-container">
      <header className="header">
        <div className="header-left">
          <button
            className="btn btn-secondary"
            onClick={handleLeaveRoom}
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            ← 离开
          </button>
          <div className="room-info">
            <div className="room-name">协作房间</div>
            <div className="room-id" onClick={copyRoomId} style={{ cursor: 'pointer' }}>
              房间号: {roomId} (点击复制)
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="users-list">
            {users.slice(0, 5).map((user, index) => (
              <div
                key={user}
                className="user-avatar"
                title={user}
                style={{
                  background: `linear-gradient(135deg, hsl(${(index * 60) % 360}, 70%, 50%), hsl(${((index * 60) + 30) % 360}, 70%, 50%))`
                }}
              >
                {user.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length > 5 && (
              <div className="user-avatar" style={{ background: '#666' }}>
                +{users.length - 5}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="main-content">
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          isWhiteboardActive={isWhiteboardActive}
          onToggleWhiteboard={handleToggleWhiteboard}
          onClearCanvas={handleClearCanvas}
        />

        <RemoteDesktop
          ref={remoteDesktopRef}
          onStatusChange={handleVncStatusChange}
          onDisplayRectChange={handleDisplayRectChange}
        >
          <Whiteboard
            tool={tool}
            color={tool === 'eraser' ? '#000000' : color}
            brushSize={tool === 'eraser' ? brushSize * 3 : brushSize}
            isActive={isWhiteboardActive}
            onDrawStart={handleDrawStart}
            onDrawMove={handleDrawMove}
            onDrawEnd={handleDrawEnd}
            drawData={drawData}
            onCursorMove={handleCursorMove}
            userId={userName}
            vncDisplayRect={vncDisplayRect}
            redrawTrigger={redrawTrigger}
          />

          {Object.entries(remoteCursors).map(([cursorUserId, cursor]) => {
            const pixelX = vncDisplayRect.offsetX + (cursor.nx || 0) * vncDisplayRect.width;
            const pixelY = vncDisplayRect.offsetY + (cursor.ny || 0) * vncDisplayRect.height;
            return (
              <div
                key={cursorUserId}
                className="cursor-indicator"
                style={{
                  transform: `translate(${pixelX}px, ${pixelY}px)`
                }}
              >
                <div
                  className="cursor-dot"
                  style={{
                    background: `hsl(${cursorUserId.length * 30 % 360}, 70%, 50%)`
                  }}
                />
                <div className="cursor-name">{cursorUserId}</div>
              </div>
            );
          })}
        </RemoteDesktop>

        <aside className="sidebar">
          <LayerManager
            strokes={drawData}
            onToggleStroke={handleToggleStroke}
            onDeleteStroke={handleDeleteStroke}
            onClearAll={handleClearCanvas}
          />

          <div className="sidebar-section">
            <h3 className="sidebar-title">远程桌面</h3>
            <div className="vnc-controls">
              <div className="vnc-status">
                <div className={`status-dot ${vncStatus === 'connected' ? 'connected' : 'disconnected'}`} />
                <span>
                  {vncStatus === 'connected' ? '已连接' :
                   vncStatus === 'connecting' ? '连接中...' :
                   vncStatus === 'error' ? '连接错误' : '未连接'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#888' }}>
                VNC服务器通过WebSocket代理连接
              </p>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">白板控制</h3>
            <div className="vnc-controls">
              <button
                className={`btn ${isWhiteboardActive ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleToggleWhiteboard}
              >
                {isWhiteboardActive ? '白板已启用' : '白板已禁用'}
              </button>
              <p style={{ fontSize: '0.8rem', color: '#888' }}>
                {isWhiteboardActive ? '可以在远程桌面上进行标注' : '点击远程桌面可与桌面交互'}
              </p>
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">在线用户 ({users.length})</h3>
            <div className="users-panel">
              {users.map((user) => (
                <div key={user} className="user-item">
                  <div
                    className="user-avatar"
                    style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}
                  >
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-item-name">
                    {user}
                    {user === userName && ' (你)'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">使用说明</h3>
            <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.6' }}>
              <p>• 点击 🖊️ 按钮启用/禁用白板</p>
              <p>• 在白板上绘制进行标注</p>
              <p>• 标注会实时同步给其他用户</p>
              <p>• 连接VNC查看远程桌面</p>
            </div>
          </div>
        </aside>
      </div>

      <div className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
        <div className={`status-dot ${socketConnected ? 'connected' : 'disconnected'}`} />
        <span>{socketConnected ? '服务器已连接' : '服务器未连接'}</span>
      </div>
    </div>
  );
}

export default Room;
