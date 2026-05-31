export function generateStrokeId() {
  return 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function exportToSVG(strokes, width = 800, height = 600) {
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .stroke-line { stroke-linecap: round; stroke-linejoin: round; fill: none; }
  </style>
`;

  strokes.forEach((stroke, index) => {
    if (!stroke.points || stroke.points.length < 2) return;
    
    const points = stroke.points.map(p => {
      const x = (p.nx !== undefined ? p.nx : (p.x || 0) / width) * width;
      const y = (p.ny !== undefined ? p.ny : (p.y || 0) / height) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const strokeWidth = stroke.brushSize || 2;
    const strokeColor = stroke.color || '#ffffff';
    const userId = stroke.userId || 'unknown';
    const strokeId = stroke.strokeId || `stroke_${index}`;

    svgContent += `  <polyline 
    id="${strokeId}" 
    class="stroke-line" 
    points="${points}" 
    stroke="${strokeColor}" 
    stroke-width="${strokeWidth}"
    data-user="${userId}"
  />\n`;
  });

  svgContent += '</svg>';
  return svgContent;
}

export function downloadSVG(strokes, filename = 'annotations.svg', width = 800, height = 600) {
  const svgContent = exportToSVG(strokes, width, height);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON(strokes) {
  return JSON.stringify(strokes, null, 2);
}

export function downloadJSON(strokes, filename = 'annotations.json') {
  const jsonContent = exportToJSON(strokes);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function saveToLocalStorage(roomId, strokes) {
  try {
    const key = `whiteboard_${roomId}`;
    localStorage.setItem(key, JSON.stringify(strokes));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function loadFromLocalStorage(roomId) {
  try {
    const key = `whiteboard_${roomId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return [];
  }
}
