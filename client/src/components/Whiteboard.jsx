import { useRef, useEffect, useCallback } from 'react';

function Whiteboard({
  tool,
  color,
  brushSize,
  isActive,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  drawData,
  onCursorMove,
  userId,
  vncDisplayRect,
  redrawTrigger
}) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentStrokeRef = useRef(null);
  const containerRef = useRef(null);
  const drawDataRef = useRef(drawData);

  drawDataRef.current = drawData;

  const toNormalized = useCallback((pixelX, pixelY) => {
    if (!vncDisplayRect || vncDisplayRect.width <= 0 || vncDisplayRect.height <= 0) {
      return { nx: 0.5, ny: 0.5 };
    }
    const nx = (pixelX - vncDisplayRect.offsetX) / vncDisplayRect.width;
    const ny = (pixelY - vncDisplayRect.offsetY) / vncDisplayRect.height;
    return {
      nx: Math.max(0, Math.min(1, nx)),
      ny: Math.max(0, Math.min(1, ny))
    };
  }, [vncDisplayRect]);

  const fromNormalized = useCallback((nx, ny) => {
    if (!vncDisplayRect || vncDisplayRect.width <= 0 || vncDisplayRect.height <= 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: vncDisplayRect.offsetX + nx * vncDisplayRect.width,
      y: vncDisplayRect.offsetY + ny * vncDisplayRect.height
    };
  }, [vncDisplayRect]);

  const getScaledBrushSize = useCallback((baseBrushSize) => {
    if (!vncDisplayRect) return baseBrushSize;
    const scale = vncDisplayRect.scale || 1;
    return baseBrushSize * scale;
  }, [vncDisplayRect]);

  const drawPath = useCallback((ctx, data) => {
    if (!data.points || data.points.length === 0) return;

    const points = data.points.map(p => {
      if (p.nx !== undefined) {
        return fromNormalized(p.nx, p.ny);
      }
      return { x: p.x || 0, y: p.y || 0 };
    });

    const bSize = getScaledBrushSize(data.brushSize || 2);

    ctx.strokeStyle = data.color || '#ffffff';
    ctx.lineWidth = bSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }, [fromNormalized, getScaledBrushSize]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = drawDataRef.current;
    if (!data || data.length === 0) return;

    data.forEach(item => {
      if (!item.hidden) {
        drawPath(ctx, item);
      }
    });

    if (currentStrokeRef.current) {
      drawPath(ctx, currentStrokeRef.current);
    }
  }, [drawPath]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    canvas.width = Math.round(containerRect.width);
    canvas.height = Math.round(containerRect.height);
    canvas.style.width = `${containerRect.width}px`;
    canvas.style.height = `${containerRect.height}px`;

    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    resizeCanvas();

    const handleResize = () => requestAnimationFrame(resizeCanvas);
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(resizeCanvas));
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [resizeCanvas]);

  useEffect(() => {
    redrawAll();
  }, [drawData, redrawAll]);

  useEffect(() => {
    requestAnimationFrame(() => {
      resizeCanvas();
    });
  }, [redrawTrigger, resizeCanvas]);

  useEffect(() => {
    requestAnimationFrame(() => {
      redrawAll();
    });
  }, [vncDisplayRect, redrawAll]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - canvasRect.left,
      y: clientY - canvasRect.top
    };
  };

  const handleMouseDown = (e) => {
    if (!isActive) return;
    e.preventDefault();
    isDrawing.current = true;
    const point = getCoordinates(e);

    const norm = toNormalized(point.x, point.y);

    if (onCursorMove) {
      onCursorMove({ nx: norm.nx, ny: norm.ny });
    }

    if (onDrawStart) {
      const strokeId = 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      currentStrokeRef.current = {
        strokeId,
        type: 'draw',
        tool,
        color,
        brushSize,
        points: [{ nx: norm.nx, ny: norm.ny }],
        userId
      };
      onDrawStart(currentStrokeRef.current);
    }
  };

  const handleMouseMove = (e) => {
    if (!isActive) return;
    const point = getCoordinates(e);

    const norm = toNormalized(point.x, point.y);
    if (onCursorMove) {
      onCursorMove({ nx: norm.nx, ny: norm.ny });
    }

    if (!isDrawing.current || !currentStrokeRef.current) return;

    currentStrokeRef.current.points.push({ nx: norm.nx, ny: norm.ny });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bSize = getScaledBrushSize(brushSize);
    const lastPoint = currentStrokeRef.current.points[currentStrokeRef.current.points.length - 2];
    const lastPixel = fromNormalized(lastPoint.nx, lastPoint.ny);

    ctx.strokeStyle = color;
    ctx.lineWidth = bSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPixel.x, lastPixel.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    if (onDrawMove) {
      onDrawMove({
        ...currentStrokeRef.current,
        lastPoint: { nx: norm.nx, ny: norm.ny }
      });
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    if (currentStrokeRef.current && onDrawEnd) {
      onDrawEnd(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
  };

  const handleMouseLeave = () => {
    isDrawing.current = false;
    if (currentStrokeRef.current && onDrawEnd) {
      onDrawEnd(currentStrokeRef.current);
    }
    currentStrokeRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`whiteboard-overlay ${isActive ? 'active' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
}

export default Whiteboard;
