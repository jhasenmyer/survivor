/**
 * MapOverlay - Renders the explorable map to a canvas (explored chunks, HOME, structures, player)
 */

const CHUNK_SIZE = 50;
const VIEWPORT_HALF = 150; // world units from player to edge (300x300 view)

const STRUCTURE_EMOJI: Record<string, string> = {
  campfire: '🔥',
  lean_to: '🏠',
  tent: '⛺',
  abandoned_shack: '🏚',
};

export interface MapRenderData {
  exploredChunkKeys: string[];
  structures: Array<{ x: number; z: number; recipeId: string }>;
  homePosition: { x: number; z: number } | null;
  playerPosition: { x: number; z: number };
  playerAngleRad?: number;
}

/**
 * Render the map to the canvas. Call when map panel is visible.
 */
export function renderMap(canvas: HTMLCanvasElement, data: MapRenderData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const px = data.playerPosition.x;
  const pz = data.playerPosition.z;
  const left = px - VIEWPORT_HALF;
  const top = pz + VIEWPORT_HALF;
  const worldW = VIEWPORT_HALF * 2;
  const worldH = VIEWPORT_HALF * 2;

  const toCanvasX = (worldX: number) => ((worldX - left) / worldW) * width;
  const toCanvasY = (worldZ: number) => ((top - worldZ) / worldH) * height;

  // Clear with dark background (unexplored)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Draw only explored chunks that intersect the viewport
  const minCx = Math.floor(left / CHUNK_SIZE);
  const maxCx = Math.floor((px + VIEWPORT_HALF) / CHUNK_SIZE);
  const minCz = Math.floor((pz - VIEWPORT_HALF) / CHUNK_SIZE);
  const maxCz = Math.floor((pz + VIEWPORT_HALF) / CHUNK_SIZE);
  const exploredSet = new Set(data.exploredChunkKeys);

  ctx.fillStyle = '#2d3a4f';
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const key = `${cx},${cz}`;
      if (!exploredSet.has(key)) continue;
      const wx = cx * CHUNK_SIZE;
      const wz = cz * CHUNK_SIZE;
      const x1 = toCanvasX(wx);
      const x2 = toCanvasX(wx + CHUNK_SIZE);
      const yTop = toCanvasY(wz + CHUNK_SIZE);
      const yBottom = toCanvasY(wz);
      ctx.fillRect(x1, yTop, x2 - x1, yBottom - yTop);
    }
  }

  // Grid between explored chunks
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let cz = minCz; cz <= maxCz; cz++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const key = `${cx},${cz}`;
      if (!exploredSet.has(key)) continue;
      const wx = cx * CHUNK_SIZE;
      const wz = cz * CHUNK_SIZE;
      const x1 = toCanvasX(wx);
      const x2 = toCanvasX(wx + CHUNK_SIZE);
      const yTop = toCanvasY(wz + CHUNK_SIZE);
      const yBottom = toCanvasY(wz);
      ctx.strokeRect(x1, yTop, x2 - x1, yBottom - yTop);
    }
  }

  // Structure icons (emoji)
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const s of data.structures) {
    const emoji = STRUCTURE_EMOJI[s.recipeId] ?? '?';
    const cx = toCanvasX(s.x);
    const cy = toCanvasY(s.z);
    if (cx >= -20 && cx <= width + 20 && cy >= -20 && cy <= height + 20) {
      ctx.fillText(emoji, cx, cy);
    }
  }

  // HOME marker
  if (data.homePosition) {
    const hx = toCanvasX(data.homePosition.x);
    const hy = toCanvasY(data.homePosition.z);
    if (hx >= -20 && hx <= width + 20 && hy >= -20 && hy <= height + 20) {
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('⌂', hx, hy);
    }
  }

  // Player (triangle or dot at center)
  const centerX = toCanvasX(px);
  const centerY = toCanvasY(pz);
  ctx.fillStyle = '#4a9eff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  if (data.playerAngleRad != null) {
    const r = 8;
    const angle = data.playerAngleRad;
    const x1 = centerX + r * Math.sin(angle);
    const y1 = centerY - r * Math.cos(angle);
    const x2 = centerX + r * 0.5 * Math.sin(angle + 2.5);
    const y2 = centerY - r * 0.5 * Math.cos(angle + 2.5);
    const x3 = centerX + r * 0.5 * Math.sin(angle - 2.5);
    const y3 = centerY - r * 0.5 * Math.cos(angle - 2.5);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
