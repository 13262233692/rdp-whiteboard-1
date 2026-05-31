import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const RemoteDesktop = forwardRef(function RemoteDesktop({
  onStatusChange,
  onDisplayRectChange,
  children
}, ref) {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const containerRef = useRef(null);
  const nativeWidthRef = useRef(800);
  const nativeHeightRef = useRef(600);
  const displayRectRef = useRef({
    offsetX: 0,
    offsetY: 0,
    width: 800,
    height: 600,
    scale: 1,
    containerWidth: 800,
    containerHeight: 600
  });
  const onDisplayRectChangeRef = useRef(onDisplayRectChange);

  onDisplayRectChangeRef.current = onDisplayRectChange;

  const computeDisplayRect = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const nativeW = nativeWidthRef.current;
    const nativeH = nativeHeightRef.current;

    const scale = Math.min(containerRect.width / nativeW, containerRect.height / nativeH);
    const displayW = nativeW * scale;
    const displayH = nativeH * scale;
    const offsetX = (containerRect.width - displayW) / 2;
    const offsetY = (containerRect.height - displayH) / 2;

    const newRect = {
      offsetX,
      offsetY,
      width: displayW,
      height: displayH,
      scale,
      containerWidth: containerRect.width,
      containerHeight: containerRect.height
    };

    const changed = (
      displayRectRef.current.offsetX !== newRect.offsetX ||
      displayRectRef.current.offsetY !== newRect.offsetY ||
      displayRectRef.current.width !== newRect.width ||
      displayRectRef.current.height !== newRect.height
    );

    displayRectRef.current = newRect;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
      canvas.style.position = 'absolute';
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;
    }

    if (changed && onDisplayRectChangeRef.current) {
      onDisplayRectChangeRef.current(newRect);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    getDisplayRect: () => displayRectRef.current,
    getNativeResolution: () => ({
      width: nativeWidthRef.current,
      height: nativeHeightRef.current
    })
  }));

  const connectVNC = useCallback(() => {
    if (wsRef.current || isConnecting) return;

    setIsConnecting(true);
    setStatus('connecting');
    if (onStatusChange) onStatusChange('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/vnc`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('VNC WebSocket connected');
        setStatus('connected');
        setIsConnecting(false);
        if (onStatusChange) onStatusChange('connected');
      };

      ws.onmessage = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(
          new Uint8ClampedArray(event.data),
          canvas.width,
          canvas.height
        );
        ctx.putImageData(imageData, 0, 0);
      };

      ws.onclose = () => {
        console.log('VNC WebSocket disconnected');
        setStatus('disconnected');
        setIsConnecting(false);
        if (onStatusChange) onStatusChange('disconnected');
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('VNC WebSocket error:', error);
        setStatus('error');
        setIsConnecting(false);
        if (onStatusChange) onStatusChange('error');
        wsRef.current = null;
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      setIsConnecting(false);
      if (onStatusChange) onStatusChange('error');
    }
  }, [isConnecting, onStatusChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = nativeWidthRef.current;
      canvas.height = nativeHeightRef.current;
    }

    computeDisplayRect();

    const handleResize = () => computeDisplayRect();
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    const container = containerRef.current;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => computeDisplayRect());
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (wsRef.current) wsRef.current.close();
    };
  }, [computeDisplayRect]);

  useEffect(() => {
    computeDisplayRect();
  }, [status, computeDisplayRect]);

  return (
    <div ref={containerRef} className="remote-desktop-container">
      <canvas
        ref={canvasRef}
        style={{
          display: status === 'connected' ? 'block' : 'none'
        }}
      />

      {status !== 'connected' && (
        <div className="remote-desktop-placeholder">
          <h3>🖥️ 远程桌面</h3>
          <p>点击右侧面板连接到VNC服务器</p>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
            当前状态: {status === 'connecting' ? '连接中...' :
                       status === 'error' ? '连接错误' : '未连接'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={connectVNC}
            disabled={isConnecting}
          >
            {isConnecting ? '连接中...' : '连接VNC'}
          </button>
        </div>
      )}

      {children}
    </div>
  );
});

export default RemoteDesktop;
