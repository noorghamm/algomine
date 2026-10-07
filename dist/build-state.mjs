export const MATERIALS = [
  { id: 'grass', name: 'Grass', color: '#75b343' },
  { id: 'dirt', name: 'Dirt', color: '#986b47' },
  { id: 'stone', name: 'Stone', color: '#8b9386' },
  { id: 'wood', name: 'Planks', color: '#bd965b' },
  { id: 'leaf', name: 'Leaves', color: '#4c8e2b' },
  { id: 'chest', name: 'Chest', color: '#bb8039' },
  { id: 'gold', name: 'Gold', color: '#e4c361' },
  { id: 'diamond', name: 'Diamond', color: '#65cbbb' },
];
export const BUILD_LIMIT = 256;
export const keyOf = ({ x, y, z }) => `${x},${y},${z}`;
export const inBounds = b =>
  b &&
  [b.x, b.y, b.z].every(Number.isInteger) &&
  Math.abs(b.x) <= 4 &&
  Math.abs(b.y) <= 4 &&
  b.z >= 0 &&
  b.z < 6;
const materialIds = new Set(MATERIALS.map(m => m.id));
export function sanitizeBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(),
    valid = [];
  for (const b of raw.slice(0, 1000)) {
    if (!inBounds(b) || !materialIds.has(b.t) || seen.has(keyOf(b))) continue;
    seen.add(keyOf(b));
    valid.push({ x: b.x, y: b.y, z: b.z, t: b.t });
    if (valid.length === BUILD_LIMIT) break;
  }
  return valid;
}
export function nextToFace(hit) {
  const b = hit.block;
  return {
    x: b.x + (hit.face === 'right' ? 1 : 0),
    y: b.y + (hit.face === 'left' ? 1 : 0),
    z: b.z + (hit.face === 'top' ? 1 : 0),
  };
}
export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i],
      [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export class BuildState {
  constructor(raw = []) {
    this.blocks = sanitizeBlocks(raw);
    this.past = [];
    this.future = [];
  }
  checkPlace(b) {
    if (!inBounds(b)) return 'Build inside the 9 × 9 plot, up to 6 blocks high.';
    if (!materialIds.has(b.t)) return 'Choose a material first.';
    if (this.blocks.some(v => keyOf(v) === keyOf(b))) return 'That space already has a block.';
    if (this.blocks.length >= BUILD_LIMIT)
      return `Your plot holds up to ${BUILD_LIMIT} blocks. Mine a few to make room.`;
    return '';
  }
  commit(next) {
    this.past.push(this.blocks);
    if (this.past.length > 50) this.past.shift();
    this.blocks = next;
    this.future = [];
  }
  place(b) {
    const error = this.checkPlace(b);
    if (error) return error;
    this.commit([...this.blocks, { x: b.x, y: b.y, z: b.z, t: b.t }]);
    return '';
  }
  remove(b) {
    const next = this.blocks.filter(v => keyOf(v) !== keyOf(b));
    if (next.length === this.blocks.length)
      return 'Choose one of your placed blocks. The island base stays in place.';
    this.commit(next);
    return '';
  }
  clear() {
    if (!this.blocks.length) return false;
    this.commit([]);
    return true;
  }
  undo() {
    if (!this.past.length) return false;
    this.future.push(this.blocks);
    this.blocks = this.past.pop();
    return true;
  }
  redo() {
    if (!this.future.length) return false;
    this.past.push(this.blocks);
    this.blocks = this.future.pop();
    return true;
  }
  top(x, y) {
    return this.blocks.filter(b => b.x === x && b.y === y).reduce((z, b) => Math.max(z, b.z), -1);
  }
  skyline() {
    const columns = new Map();
    for (const b of this.blocks) {
      const k = `${b.x},${b.y}`;
      const current = columns.get(k);
      if (!current || b.z + 1 > current.height) columns.set(k, { x: b.x, y: b.y, height: b.z + 1 });
    }
    return [...columns.values()].sort((a, b) => a.y - b.y || a.x - b.x).map(b => b.height);
  }
}
