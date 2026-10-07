// Measure every lesson on an input of n = 50: frame count and wall time, as a markdown table.
// Usage: node scripts/measure.mjs [n]
import { lessons, simulate } from '../dist/algorithms.mjs';

const n = Number(process.argv[2] || 50);
const rng = (() => {
  let state = 20261007;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
})();
const numbers = Array.from({ length: n }, () => 1 + Math.floor(rng() * 20));
const letters = 'abcdr';
const text = Array.from({ length: n }, () => letters[Math.floor(rng() * letters.length)]).join('');
const brackets = Array.from({ length: n }, () => '()[]{}'[Math.floor(rng() * 6)]).join('');

// Lessons whose data structure has a fixed capacity cannot take 50 values; the table notes the cap.
const caps = { hash: 10 }; // eleven chests, the lesson keeps at least one empty
// Graph lessons run on the fixed seven-node map whatever input they receive.
const fixedMap = new Set(['bfs', 'dfs', 'dijkstra', 'prim', 'topo']);

function inputFor(lesson) {
  const kind = lesson.inputKind || 'numbers';
  if (kind === 'fixed' || fixedMap.has(lesson.id))
    return { input: lesson.sample?.input ?? [1, 2, 3, 4, 5, 6, 7], target: lesson.sample?.target };
  if (kind === 'text') {
    const input = lesson.id === 'brackets' ? brackets : text;
    const target = lesson.target ? (lesson.sample?.target ?? 'ab') : undefined;
    return { input, target };
  }
  const input = caps[lesson.id] ? numbers.slice(0, caps[lesson.id]) : numbers;
  const target = lesson.target ? (lesson.sample?.target ?? numbers[Math.floor(n / 2)]) : undefined;
  return { input, target, capped: Boolean(caps[lesson.id]) };
}

const rows = [];
for (const lesson of lessons) {
  const { input, target, capped } = inputFor(lesson);
  // Warm up once so the first measurement is not paying for module JIT.
  simulate(lesson.id, input, target);
  const started = performance.now();
  const frames = simulate(lesson.id, input, target);
  const ms = performance.now() - started;
  const size = typeof input === 'string' ? input.length : input.length;
  rows.push({ id: lesson.id, name: lesson.name, size, frames: frames.length, ms, capped });
}

console.log(`| Lesson | Input size | Frames | Time (ms) |`);
console.log(`| --- | ---: | ---: | ---: |`);
for (const r of rows)
  console.log(
    `| ${r.name} (\`${r.id}\`) | ${r.size}${r.capped ? ' (capacity)' : ''} | ${r.frames} | ${r.ms.toFixed(2)} |`
  );
const total = rows.reduce((s, r) => s + r.ms, 0);
console.log(
  `\n${rows.length} lessons, ${rows.reduce((s, r) => s + r.frames, 0)} frames, ${total.toFixed(1)} ms total.`
);
