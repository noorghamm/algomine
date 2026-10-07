import { pointInPolygon, nextToFace } from './build-state.mjs';
import { makeTree, graphEdges } from './algorithms.mjs';
const colors = {
  grass: ['#75b343', '#88613f', '#67472e'],
  dirt: ['#a3835e', '#8c6649', '#644d36'],
  leaf: ['#65a336', '#49852b', '#31611f'],
  trunk: ['#b69465', '#886440', '#66472d'],
  stone: ['#93988c', '#767e72', '#555f55'],
  sand: ['#e3d09c', '#c2ac78', '#9f8b61'],
  red: ['#ecb392', '#c28363', '#94583f'],
  gold: ['#f1d891', '#c7a953', '#a08235'],
  diamond: ['#99e6d4', '#65baaa', '#3e9689'],
  water: ['#8ecacf', '#5ba4b8', '#477e9b'],
  ice: ['#c2e2dc', '#96beb9', '#789eab'],
  purple: ['#c2afd4', '#a08bb6', '#76698e'],
  chest: ['#c5a16a', '#a07a4c', '#735532'],
  dark: ['#626e60', '#4c5846', '#364232'],
  wood: ['#c3ae7b', '#9b8256', '#766143'],
};
const themes = {
  grass: { sky: ['#69b4ea', '#c5e2ea'], ground: 'grass' },
  sand: { sky: ['#c8cfb8', '#e7d4a9'], ground: 'sand' },
  red: { sky: ['#b9c2b6', '#d3c8af'], ground: 'grass' },
  wood: { sky: ['#c0cbb2', '#d4ddba'], ground: 'grass' },
  forest: { sky: ['#91b8ad', '#c1d3ad'], ground: 'grass' },
  water: { sky: ['#98c5d1', '#d1e4d4'], ground: 'grass' },
  ice: { sky: ['#a9cbd9', '#dce8da'], ground: 'ice' },
  purple: { sky: ['#b8b6ce', '#d6cccf'], ground: 'stone' },
  canopy: { sky: ['#7fb59a', '#d2e6c2'], ground: 'grass' },
  rune: { sky: ['#8f82bd', '#d9cdea'], ground: 'purple' },
  forge: { sky: ['#b07c62', '#e6c6a2'], ground: 'red' },
};
// Which view a topic draws by default. A lesson can override it with lesson.view.
export const defaultViews = {
  sorting: 'bars',
  search: 'array',
  list: 'list',
  hash: 'hash',
  stack: 'stack',
  tree: 'tree',
  heap: 'tree',
  balanced: 'tree',
  graph: 'graph',
  strings: 'text',
  compress: 'forest',
};
const noise = (x, y, z, n) =>
  Math.abs(Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + n * 43.1) * 43758.5453) % 1;
export class VoxelWorld {
  constructor(canvas, { interactive = false, onInspect, onBuildAction, onBuildHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.angle = 0;
    this.zoom = 1;
    this.night = false;
    this.options = {};
    this.hits = [];
    this.buildFaces = [];
    this.buildHover = null;
    this.onInspect = onInspect;
    this.onBuildAction = onBuildAction;
    this.onBuildHover = onBuildHover;
    this.resize = new ResizeObserver(() => this.draw());
    this.resize.observe(canvas);
    if (interactive) {
      let drag = false,
        lastX = 0,
        lastY = 0,
        moved = 0;
      const hover = e => {
        const r = canvas.getBoundingClientRect();
        const hit = this.pickBuild(e.clientX - r.left, e.clientY - r.top);
        this.buildHover = hit;
        this.onBuildHover?.(hit);
        this.draw();
      };
      canvas.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        drag = true;
        lastX = e.clientX;
        lastY = e.clientY;
        moved = 0;
        canvas.focus({ preventScroll: true });
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener('pointermove', e => {
        if (!drag) {
          if (this.options.build) hover(e);
          return;
        }
        const dx = e.clientX - lastX,
          dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        moved += Math.hypot(dx, dy);
        if (moved > 5) {
          this.buildHover = null;
          this.angle = Math.max(-0.26, Math.min(0.26, this.angle + dx * 0.002));
          this.draw();
        }
      });
      canvas.addEventListener('pointerup', e => {
        if (!drag) return;
        drag = false;
        if (moved >= 5) return;
        const r = canvas.getBoundingClientRect(),
          x = e.clientX - r.left,
          y = e.clientY - r.top;
        if (this.options.build) {
          const hit = this.pickBuild(x, y);
          this.buildHover = null;
          this.onBuildAction?.(hit);
          return;
        }
        const hit = this.hits.findLast(p => Math.abs(p.x - x) < p.r && Math.abs(p.y - y) < p.r);
        if (hit) this.onInspect?.(hit);
      });
      canvas.addEventListener('pointerleave', () => {
        if (this.buildHover) {
          this.buildHover = null;
          this.draw();
        }
      });
      canvas.addEventListener('pointercancel', () => {
        drag = false;
        this.buildHover = null;
        this.draw();
      });
      canvas.addEventListener(
        'wheel',
        e => {
          e.preventDefault();
          this.zoom = Math.max(0.7, Math.min(1.35, this.zoom - e.deltaY * 0.001));
          this.buildHover = null;
          this.draw();
        },
        { passive: false }
      );
    }
  }
  pickBuild(x, y) {
    return this.buildFaces.findLast(face => pointInPolygon(x, y, face.points)) || null;
  }

  set(options) {
    const old = this.options.frame,
      newFrame = options.frame;
    cancelAnimationFrame(this.animation);
    this.transition = null;
    if (
      options.topic === 'sorting' &&
      old &&
      newFrame &&
      newFrame.swapping &&
      newFrame.active.length === 2 &&
      old.values.length === newFrame.values.length &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const [i, j] = newFrame.active;
      if (
        old.values[i] === newFrame.values[j] &&
        old.values[j] === newFrame.values[i] &&
        old.values[i] !== newFrame.values[i]
      )
        this.transition = { i, j, start: performance.now(), duration: 300 };
    }
    this.options = { ...this.options, ...options };
    this.draw();
  }
  reset() {
    this.angle = 0;
    this.zoom = 1;
    this.draw();
  }
  destroy() {
    this.resize.disconnect();
  }
  draw() {
    const { canvas, ctx } = this,
      w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    this.hits = [];
    this.buildFaces = [];
    const {
      topic = 'sorting',
      terrain = 'grass',
      frame,
      thumbnail = false,
      hero = false,
      algorithm = 'bubble',
    } = this.options;
    const theme = themes[terrain] || themes.grass;
    const night = this.night;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, night ? '#172a3c' : theme.sky[0]);
    gradient.addColorStop(1, night ? '#435960' : theme.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    if (night) {
      ctx.fillStyle = '#d6e1c6';
      for (let i = 0; i < 32; i++) ctx.fillRect(noise(i, 1, 2, 2) * w, noise(i, 1, 2, 3) * h * 0.52, 2, 2);
    }
    ctx.fillStyle = night ? '#eee9bd' : '#f5e8b6';
    let sun = thumbnail ? 18 : 34;
    ctx.fillRect(w * 0.82, h * 0.12, sun, sun);
    ctx.fillStyle = night ? '#657778' : '#eceddb';
    [
      [0.07, 0.19, 0.17],
      [0.44, 0.11, 0.18],
      [0.68, 0.28, 0.12],
    ].forEach(([x, y, l]) => {
      ctx.fillRect(w * x, h * y, w * l, thumbnail ? 6 : 12);
      ctx.fillRect(w * x + w * l * 0.25, h * y - (thumbnail ? 4 : 7), w * l * 0.5, thumbnail ? 4 : 7);
    });
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = night ? ['#334d49', '#3e5b4c'][layer] : ['#8eaf9c', '#839f80'][layer];
      for (let i = 0; i < 14; i++) {
        const top = h * (0.43 + layer * 0.08) - noise(i, layer, 1, 2) * h * 0.11;
        ctx.fillRect((i * w) / 13, top, w / 13 + 1, h - top);
      }
    }
    const scale = Math.min(w / (thumbnail ? 17 : 24), h / (thumbnail ? 12 : 16)) * this.zoom;
    const ox = w * (hero && w > 650 ? 0.72 : 0.5),
      oy = h * (this.options.build ? 0.6 : hero ? (w > 650 ? 0.6 : 0.81) : thumbnail ? 0.5 : 0.57);
    const project = (x, y, z) => {
      const xx = x * Math.cos(this.angle) - y * Math.sin(this.angle),
        yy = x * Math.sin(this.angle) + y * Math.cos(this.angle);
      return [ox + (xx - yy) * scale, oy + (xx + yy) * scale * 0.46 - z * scale * 0.85];
    };
    const uv = (u, v) => [(u + v) / 2, (v - u) / 2];
    const poly = (pts, c) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    };
    const quadPoint = (p, s, t) => [
      p[0][0] * (1 - s) * (1 - t) + p[1][0] * s * (1 - t) + p[2][0] * s * t + p[3][0] * (1 - s) * t,
      p[0][1] * (1 - s) * (1 - t) + p[1][1] * s * (1 - t) + p[2][1] * s * t + p[3][1] * (1 - s) * t,
    ];
    function texture(pts, x, y, z, side) {
      for (let i = 0; i < 14; i++) {
        const sx = Math.floor(noise(x, y, z, i + side * 7) * 8) / 8,
          sy = Math.floor(noise(x, y, z, i + side * 13 + 4) * 8) / 8;
        poly(
          [
            quadPoint(pts, sx, sy),
            quadPoint(pts, sx + 0.125, sy),
            quadPoint(pts, sx + 0.125, sy + 0.125),
            quadPoint(pts, sx, sy + 0.125),
          ],
          i % 2 ? '#18211035' : '#ffffff28'
        );
      }
    }
    const cube = o => {
      const { x, y, z, t } = o,
        p = colors[t] || colors.grass,
        A = project(x, y, z + 1),
        B = project(x + 1, y, z + 1),
        C = project(x + 1, y + 1, z + 1),
        D = project(x, y + 1, z + 1),
        E = project(x, y + 1, z),
        F = project(x + 1, y + 1, z),
        G = project(x + 1, y, z);
      const top = [A, B, C, D],
        left = [D, C, F, E],
        right = [B, C, F, G];
      poly(left, p[1]);
      poly(right, p[2]);
      poly(top, p[0]);
      if (!thumbnail || o.detail) {
        texture(top, x, y, z, 1);
        texture(left, x, y, z, 2);
        texture(right, x, y, z, 3);
      }
      if (t === 'grass') {
        for (const [face, shade] of [
          [left, '#629835'],
          [right, '#467b2b'],
        ]) {
          poly([face[0], face[1], quadPoint(face, 1, 0.22), quadPoint(face, 0, 0.22)], shade);
          for (let i = 0; i < 8; i++) {
            const u = i / 8,
              v = 0.22 + noise(x, y, z, i) * 0.22;
            poly(
              [
                quadPoint(face, u, 0.2),
                quadPoint(face, u + 0.125, 0.2),
                quadPoint(face, u + 0.125, v),
                quadPoint(face, u, v),
              ],
              shade
            );
          }
        }
      }
      if (t === 'stone' && z <= -3 && noise(x, y, z, 7) > 0.72) {
        for (const face of [left, right])
          for (let i = 0; i < 4; i++) {
            const u = 0.15 + (i % 2) * 0.4,
              v = 0.18 + Math.floor(i / 2) * 0.4;
            poly(
              [
                quadPoint(face, u, v),
                quadPoint(face, u + 0.16, v),
                quadPoint(face, u + 0.16, v + 0.15),
                quadPoint(face, u, v + 0.15),
              ],
              noise(x, y, z, 1) > 0.5 ? '#55cfc7' : '#d8b257'
            );
          }
      }
      if (t === 'trunk') {
        for (const face of [left, right])
          for (let i = 1; i < 4; i++) {
            const u = i / 4;
            poly(
              [
                quadPoint(face, u, 0),
                quadPoint(face, u + 0.08, 0),
                quadPoint(face, u + 0.08, 1),
                quadPoint(face, u, 1),
              ],
              '#3d2b2670'
            );
          }
      }
      if (t === 'wood') {
        for (let i = 1; i < 4; i++) {
          const v = i / 4;
          poly(
            [
              quadPoint(top, 0, v),
              quadPoint(top, 1, v),
              quadPoint(top, 1, v + 0.045),
              quadPoint(top, 0, v + 0.045),
            ],
            '#594021'
          );
        }
      }
      if (this.options.build) {
        for (const [face, points] of [
          ['left', left],
          ['right', right],
          ['top', top],
        ])
          this.buildFaces.push({ block: o, face, points });
      }
      if (t === 'chest') {
        poly(
          [
            quadPoint(left, 0.05, 0.35),
            quadPoint(left, 0.95, 0.35),
            quadPoint(left, 0.95, 0.46),
            quadPoint(left, 0.05, 0.46),
          ],
          '#695132'
        );
        poly(
          [
            quadPoint(left, 0.42, 0.3),
            quadPoint(left, 0.58, 0.3),
            quadPoint(left, 0.58, 0.63),
            quadPoint(left, 0.42, 0.63),
          ],
          '#eed28a'
        );
      }
    };
    if (this.options.build) {
      const b = this.options.build,
        base = [];
      for (let x = -4; x <= 4; x++)
        for (let y = -4; y <= 4; y++) {
          base.push({ x, y, z: -2, t: 'stone' }, { x, y, z: -1, t: theme.ground });
        }
      const depth = o => (o.x + o.y) * Math.cos(this.angle) + (o.x - o.y) * Math.sin(this.angle);
      [...base, ...b.blocks].sort((a, b) => depth(a) - depth(b) || a.z - b.z).forEach(cube);
      const hit = this.buildHover;
      const target = hit ? (b.tool === 'mine' ? hit.block : nextToFace(hit)) : b.cursor;
      if (target) {
        const valid =
          b.tool === 'mine'
            ? target.z >= 0 && b.blocks.some(p => p.x === target.x && p.y === target.y && p.z === target.z)
            : !b.checkPlace({ ...target, t: b.material });
        const stroke = valid ? '#e9ffc0' : '#ff9b76';
        if (b.tool === 'mine' && hit) {
          ctx.beginPath();
          hit.points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
          ctx.closePath();
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          const { x, y, z } = target;
          const corners = [
            [x, y, z],
            [x + 1, y, z],
            [x + 1, y + 1, z],
            [x, y + 1, z],
            [x, y, z + 1],
            [x + 1, y, z + 1],
            [x + 1, y + 1, z + 1],
            [x, y + 1, z + 1],
          ].map(p => project(...p));
          poly([corners[4], corners[5], corners[6], corners[7]], valid ? '#dcffae44' : '#ff573c44');
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          for (const [a, c] of [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [4, 5],
            [5, 6],
            [6, 7],
            [7, 4],
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7],
          ]) {
            ctx.beginPath();
            ctx.moveTo(...corners[a]);
            ctx.lineTo(...corners[c]);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }
      return;
    }

    const ground = [],
      objects = [],
      labels = [],
      lines = [];
    const addUV = (u, v, z, t, list = objects, detail = true) => {
      const [x, y] = uv(u, v);
      list.push({ x, y, z, t, detail });
    };
    const radius = thumbnail ? 5 : 7;
    for (let x = -radius; x <= radius; x++)
      for (let y = -radius; y <= radius; y++) {
        const u = x - y,
          v = x + y;
        if (Math.abs(u) > (thumbnail ? 7.5 : 10.5) || v < -(thumbnail ? 6 : 8) || v > (thumbnail ? 5 : 6.5))
          continue;
        if (Math.abs(u) > (thumbnail ? 6 : 9) && Math.abs(v) > 3 && noise(x, y, 0, 3) > 0.5) continue;
        ground.push({ x, y, z: -3, t: 'stone' });
        if (noise(x, y, 0, 8) > 0.3) ground.push({ x, y, z: -4, t: 'stone' });
        ground.push({ x, y, z: -2, t: terrain === 'ice' ? 'stone' : 'dirt' });
        ground.push({ x, y, z: -1, t: theme.ground });
        if (v > 3 && terrain === 'water' && u > 1) ground[ground.length - 1].t = 'water';
      }
    const tree = (u, v, size = 1) => {
      const [x, y] = uv(u, v);
      for (let z = 0; z < 3; z++) objects.push({ x, y, z, t: 'trunk', detail: true });
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          objects.push({ x: x + dx, y: y + dy, z: 2, t: terrain === 'ice' ? 'ice' : 'leaf', detail: true });
          if (Math.abs(dx) + Math.abs(dy) < 3)
            objects.push({ x: x + dx, y: y + dy, z: 3, t: terrain === 'ice' ? 'ice' : 'leaf', detail: true });
        }
      objects.push({ x, y, z: 4, t: terrain === 'ice' ? 'ice' : 'leaf', detail: true });
    };
    const viewName = this.options.view || defaultViews[topic] || 'bars';
    if (!['tree', 'forest', 'graph', 'grid'].includes(viewName)) {
      tree(-6, -5);
      if (!thumbnail) tree(7, -5);
      else tree(5, -4);
    } else {
      if (!thumbnail) {
        tree(-9, -5);
        tree(8, -6);
      }
    }
    for (let u = -5; u <= 5; u += 1.4)
      addUV(u, thumbnail ? 3.5 : 4.5, -0.92, terrain === 'sand' ? 'stone' : 'wood', ground, false);
    const torches = thumbnail
      ? []
      : [
          [-8, 3],
          [8, 3],
        ];
    const f = frame || { values: [7, 3, 9, 4, 6, 2], active: [], marked: [], discarded: [], nodes: [] };
    const a = f.values || [];
    let view = this.options.view || defaultViews[topic] || 'bars';
    if (view === 'stack' && algorithm === 'queue') view = 'queue';
    const baseBlock = view === 'hash' ? 'chest' : view === 'array' ? 'sand' : 'grass';
    const material = (i, list = f) =>
      (list.active || []).includes(i)
        ? f.swapping
          ? 'red'
          : 'gold'
        : (list.discarded || []).includes(i)
          ? 'dark'
          : (list.marked || []).includes(i)
            ? 'diamond'
            : baseBlock;
    const label = (u, v, z, text, id, sub) => {
      const [x, y] = uv(u + 0.5, v);
      labels.push({ x, y, z, text, id, sub });
    };
    const subLabel = (u, v, id) => {
      if (f.sub && f.sub[id] !== undefined && !thumbnail) label(u, v + 1.05, 0.2, f.sub[id], null, 'sub');
    };
    if (view === 'bars') {
      a.forEach((value, i) => {
        let slot = i;
        if (this.transition) {
          const t = Math.min(1, (performance.now() - this.transition.start) / this.transition.duration),
            ease = t * t * (3 - 2 * t),
            { i: left, j: right } = this.transition;
          if (i === left) slot = right + (left - right) * ease;
          if (i === right) slot = left + (right - left) * ease;
        }
        const u = (slot - (a.length - 1) / 2) * (thumbnail ? 1.65 : 1.8),
          v = 0,
          height = Math.max(1, Math.ceil(Number(value) * 0.4));
        for (let z = 0; z < height; z++)
          addUV(u, v, z, z === height - 1 ? material(i) : material(i) === 'grass' ? 'dirt' : material(i));
        label(u, 0, height + 0.35, value, i);
        if (!thumbnail) label(u, 2.2, 0, i, null, 'index');
      });
      if (f.range && !thumbnail) {
        const [lo, hi] = f.range;
        for (let i = lo; i <= hi; i++) addUV((i - (a.length - 1) / 2) * 1.8, 0, -0.98, 'gold', ground, false);
      }
    } else if (['array', 'list', 'hash'].includes(view)) {
      const space = view === 'hash' ? 1.5 : 1.8;
      a.forEach((value, i) => {
        const u = (i - (a.length - 1) / 2) * space;
        if (Array.isArray(value)) {
          // A chain: stack one chest per stored value.
          if (!value.length) {
            addUV(u, 0, -0.98, 'dark', ground, false);
            label(u, 0, 0.5, '·', i);
          } else
            value.forEach((item, k) => {
              addUV(u, 0, k, k === value.length - 1 ? material(i) : 'chest');
              label(u, 0, k + 0.75, item, k === 0 ? i : null);
            });
        } else {
          addUV(u, 0, 0, material(i));
          label(u, 0, 1.55, value === null ? '·' : value, i);
        }
        if (!thumbnail) label(u, 2, 0, i, null, 'index');
        subLabel(u, 1.3, i);
        if (view === 'list' && i < a.length - 1)
          lines.push({
            from: [u + 0.7, 0, 0.45],
            to: [u + space + 0.3, 0, 0.45],
            active: f.activeEdge?.[0] === i,
          });
      });
    } else if (view === 'queue') {
      a.forEach((value, i) => {
        const u = (i - (a.length - 1) / 2) * 1.8;
        addUV(u, 0, 0, material(i) === 'grass' ? 'chest' : material(i));
        label(u, 0, 1.65, value, i);
      });
      if (a.length && !thumbnail) {
        label(-(a.length - 1) * 0.9, 2, 0, 'FRONT', null, 'index');
        label((a.length - 1) * 0.9, 2, 0, 'REAR', null, 'index');
      }
    } else if (view === 'stack') {
      a.forEach((value, i) => {
        addUV(-0.5, 0, i, material(i) === 'grass' ? 'chest' : material(i));
        label(1.4, 0, i + 0.5, value, i);
      });
      if (!a.length) label(0, 0, 1, 'EMPTY', null, 'index');
      else if (!thumbnail) label(-0.5, 0, a.length + 0.7, 'TOP', null, 'index');
    } else if (view === 'tree' || view === 'forest') {
      const ns = f.nodes?.length ? f.nodes : view === 'tree' ? makeTree(a, topic === 'heap') : [];
      const roots = view === 'forest' ? f.roots || [] : ns.length ? [0] : [];
      const pos = new Map();
      let rank = 0,
        maxDepth = 0;
      const layout = (id, depth) => {
        if (id === null || id === undefined) return;
        const n = ns[id];
        if (!n || pos.has(id)) return;
        layout(n.left, depth + 1);
        pos.set(id, { u: rank++, depth });
        maxDepth = Math.max(maxDepth, depth);
        layout(n.right, depth + 1);
      };
      for (const root of roots) {
        layout(root, 0);
        if (view === 'forest') rank += 0.6;
      }
      const count = Math.max(1, rank - 1);
      const spread = Math.min(2.4, 14 / count);
      for (const [, p] of pos) {
        p.u = (p.u - count / 2) * spread;
        p.v = (p.depth - maxDepth / 2) * (maxDepth > 4 ? 1.6 : maxDepth > 2 ? 2.2 : 2.8);
      }
      for (const n of ns) {
        const p = pos.get(n.id);
        if (!p) continue;
        for (const child of [n.left, n.right])
          if (child !== null && child !== undefined && pos.has(child)) {
            const q = pos.get(child);
            lines.push({
              from: [p.u + 0.5, p.v + 0.5, 0.35],
              to: [q.u + 0.5, q.v + 0.5, 0.35],
              active: f.activeEdge?.[0] === n.id && f.activeEdge?.[1] === child,
            });
          }
        addUV(p.u, p.v, 0, material(n.id) === 'grass' ? 'wood' : material(n.id));
        label(p.u, p.v, 1.4, n.value, n.id);
        subLabel(p.u, p.v, n.id);
      }
    } else if (view === 'graph') {
      const points = [
        [-0.5, -5],
        [-4, -1],
        [3, -1],
        [-6, 3],
        [-1, 3],
        [5.5, 3],
        [-0.5, 6.5],
      ];
      const edges = f.edges || graphEdges.map(([from, to]) => ({ from, to }));
      edges.forEach(e => {
        const p = points[e.from],
          q = points[e.to];
        if (!p || !q) return;
        lines.push({
          from: [p[0] + 0.5, p[1] + 0.5, 0.3],
          to: [q[0] + 0.5, q[1] + 0.5, 0.3],
          active:
            e.state === 'active' || (f.activeEdge && [e.from, e.to].every(k => f.activeEdge.includes(k))),
          state: e.state,
          weight: e.weight,
          directed: e.directed,
        });
      });
      points.forEach(([u, v], i) => {
        addUV(u, v, 0, material(i) === 'grass' ? 'stone' : material(i));
        label(u, v, 1.4, i + 1, i);
        subLabel(u, v, i);
      });
    } else if (view === 'grid') {
      const g = f.grid;
      if (g && g.cells?.length) {
        const rows = g.cells.length,
          cols = Math.max(...g.cells.map(r => r.length));
        const gapU = Math.min(1.7, 15 / cols),
          gapV = Math.min(2.4, 15 / rows);
        const key = (r, c) => `${r},${c}`;
        const marked = new Set((g.marked || []).map(([r, c]) => key(r, c)));
        const path = new Set((g.path || []).map(([r, c]) => key(r, c)));
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const u = (c - (cols - 1) / 2) * gapU,
              v = (r - (rows - 1) / 2) * gapV;
            const value = g.cells[r]?.[c];
            const empty = value === null || value === undefined;
            const isActive = g.active && g.active[0] === r && g.active[1] === c;
            const t = isActive
              ? 'gold'
              : path.has(key(r, c))
                ? 'diamond'
                : marked.has(key(r, c))
                  ? 'wood'
                  : empty
                    ? 'dark'
                    : 'stone';
            // Flat tiles keep the table readable; the active cell pops up as a block.
            if (isActive) addUV(u, v, 0, t);
            else addUV(u, v, -0.98, t, ground, false);
            if (!empty) label(u, v, isActive ? 1.3 : 0.25, value, null, 'cell');
          }
        if (!thumbnail) {
          (g.colLabels || []).forEach((text, c) =>
            label(
              (c - (cols - 1) / 2) * gapU,
              -((rows - 1) / 2) * gapV - 1.4,
              0.3,
              text || 'ε',
              null,
              'index'
            )
          );
          (g.rowLabels || []).forEach((text, r) =>
            label(
              -((cols - 1) / 2) * gapU - 1.6,
              (r - (rows - 1) / 2) * gapV,
              0.3,
              text || 'ε',
              null,
              'index'
            )
          );
        }
      }
    } else if (view === 'text') {
      const rows = f.text?.rows || [{ label: 'TEXT', chars: a }];
      const longest = Math.max(1, ...rows.map(r => (r.chars?.length || 0) + (r.offset || 0)));
      const space = Math.min(1.6, 15 / longest);
      rows.forEach((row, k) => {
        const v = (k - (rows.length - 1) / 2) * 2.6;
        (row.chars || []).forEach((ch, i) => {
          const u = (i + (row.offset || 0) - (longest - 1) / 2) * space;
          const t = material(i, row);
          addUV(u, v, 0, t === 'grass' ? (k === 0 ? 'purple' : 'wood') : t);
          label(u, v, 1.5, ch, k === 0 ? i : null);
          if (!thumbnail && k === 0) label(u, v - 1.3, 0, i, null, 'index');
        });
        if (row.label && !thumbnail)
          label(-((longest - 1) / 2) * space - 1.6, v, 0.4, row.label, null, 'index');
      });
    }
    const depth = o => (o.x + o.y) * Math.cos(this.angle) + (o.x - o.y) * Math.sin(this.angle);
    ground.sort((a, b) => depth(a) - depth(b) || a.z - b.z).forEach(cube);
    for (const line of lines) {
      const from = uv(line.from[0], line.from[1]),
        to = uv(line.to[0], line.to[1]);
      const p = project(...from, line.from[2]),
        q = project(...to, line.to[2]);
      const palette =
        line.state === 'tree'
          ? ['#b8ed80', '#e6ffc4']
          : line.state === 'rejected'
            ? ['#3f4a3c', '#55615150']
            : line.active
              ? ['#f6d985', '#ffecb4']
              : view === 'list'
                ? ['#ac6249', '#bdc39a']
                : ['#687c53', '#bdc39a'];
      ctx.beginPath();
      ctx.moveTo(...p);
      ctx.lineTo(...q);
      ctx.strokeStyle = palette[0];
      ctx.lineWidth = thumbnail ? 3 : line.state === 'tree' ? 6 : 5;
      ctx.stroke();
      ctx.strokeStyle = palette[1];
      ctx.lineWidth = 1;
      ctx.stroke();
      if (line.directed && !thumbnail) {
        const dx = q[0] - p[0],
          dy = q[1] - p[1],
          len = Math.hypot(dx, dy) || 1,
          ux = dx / len,
          uy = dy / len,
          tipX = p[0] + dx * 0.72,
          tipY = p[1] + dy * 0.72,
          size = 9;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ux * size - uy * size * 0.6, tipY - uy * size + ux * size * 0.6);
        ctx.lineTo(tipX - ux * size + uy * size * 0.6, tipY - uy * size - ux * size * 0.6);
        ctx.closePath();
        ctx.fillStyle = palette[0];
        ctx.fill();
      }
      if (line.weight !== undefined && !thumbnail) {
        const mx = (p[0] + q[0]) / 2,
          my = (p[1] + q[1]) / 2;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = line.state === 'rejected' ? '#2a332a' : '#17291f';
        ctx.fillRect(mx - 10, my - 8, 20, 16);
        ctx.fillStyle =
          line.state === 'rejected'
            ? '#7b8a74'
            : line.active || line.state === 'tree'
              ? '#ffe3a0'
              : '#dfe8cf';
        ctx.fillText(line.weight, mx, my + 0.5);
      }
    }
    objects.sort((a, b) => depth(a) - depth(b) || a.z - b.z).forEach(cube);
    for (const [u, v] of torches) {
      const [x, y] = uv(u, v),
        [px, py] = project(x, y, 1.1),
        unit = Math.max(2, Math.floor(scale / 8));
      if (night) {
        const glow = ctx.createRadialGradient(px, py, 0, px, py, scale * 2);
        glow.addColorStop(0, '#ffbd4577');
        glow.addColorStop(1, '#ffad2700');
        ctx.fillStyle = glow;
        ctx.fillRect(px - scale * 2, py - scale * 2, scale * 4, scale * 4);
      }
      ctx.fillStyle = '#4c301c';
      ctx.fillRect(px - unit, py, unit * 2, unit * 7);
      ctx.fillStyle = '#b4803f';
      ctx.fillRect(px - unit, py, unit, unit * 6);
      ctx.fillStyle = '#db6728';
      ctx.fillRect(px - unit * 2, py - unit * 2, unit * 4, unit * 3);
      ctx.fillStyle = '#ffce54';
      ctx.fillRect(px - unit, py - unit * 3, unit * 2, unit * 3);
      ctx.fillStyle = '#fff5a5';
      ctx.fillRect(px - unit / 2, py - unit * 2, unit, unit * 2);
    }
    for (const l of labels) {
      const [x, y] = project(l.x, l.y, l.z),
        isIndex = l.sub === 'index',
        isSub = l.sub === 'sub' || l.sub === 'cell';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = isIndex
        ? `${thumbnail ? 7 : 9}px monospace`
        : isSub
          ? 'bold 9px monospace'
          : `bold ${thumbnail ? 10 : Math.max(11, Math.min(15, scale * 0.5))}px monospace`;
      const text = String(l.text);
      const width = Math.max(isSub ? 16 : 20, ctx.measureText(text).width + (isSub ? 8 : 12));
      if (isSub) {
        ctx.fillStyle = '#2b3a2ae6';
        ctx.fillRect(Math.round(x - width / 2), Math.round(y - 7), width, 14);
        ctx.fillStyle = '#cfe6b8';
      } else if (!isIndex) {
        ctx.fillStyle = '#17291fdf';
        ctx.fillRect(Math.round(x - width / 2), Math.round(y - 10), width, 20);
        ctx.fillStyle = (f.active || []).includes(l.id) ? '#ffe3a0' : '#f1f7e2';
      } else ctx.fillStyle = '#f0f5dbe0';
      ctx.fillText(text, x, y + 0.5);
      if (l.id !== null && l.id !== undefined)
        this.hits.push({ x, y, r: Math.max(14, width / 2), value: l.text, index: l.id });
    }
    if (this.transition) {
      if (performance.now() - this.transition.start < this.transition.duration)
        this.animation = requestAnimationFrame(() => this.draw());
      else this.transition = null;
    }
    if (night) {
      ctx.fillStyle = '#12273920';
      ctx.fillRect(0, 0, w, h);
    }
  }
}
