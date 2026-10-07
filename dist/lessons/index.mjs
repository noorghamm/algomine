import { Recorder } from './recorder.mjs';

// Every lesson id, grouped by topic. A missing file is skipped so lessons can land one at a time.
export const manifest = [
  // Sorting Plains
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'heapsort',
  'counting',
  'radix',
  // Search Quarry
  'linear',
  'binary',
  // Redstone Railway
  'traverse',
  'listInsert',
  'listDelete',
  // Storage Stronghold
  'stack',
  'queue',
  'brackets',
  // Binary Forest
  'bst',
  'inorder',
  'preorder',
  'postorder',
  'bstInsert',
  'bstDelete',
  // Canopy Citadel
  'avl',
  // Pathfinder Valley
  'bfs',
  'dfs',
  'dijkstra',
  'prim',
  'topo',
  // Diamond Peak
  'heap',
  'heapInsert',
  'extractMax',
  // Chest Archives
  'hash',
  'chaining',
  // Rune Library
  'naive',
  'kmp',
  'editDistance',
  // Compression Forge
  'huffman',
];

const loaded = await Promise.all(
  manifest.map(id =>
    import(`./${id}.mjs`).then(
      m => m.default,
      () => null
    )
  )
);

export const lessons = loaded.filter(Boolean);
export const definitions = Object.fromEntries(lessons.map(l => [l.id, l]));

// Run a lesson and return its frames. Never mutates `input`.
export function simulate(id, input, target = 6) {
  const lesson = definitions[id];
  if (!lesson) throw new Error(`Unknown lesson: ${id}`);
  const r = new Recorder(input, target);
  lesson.prepare?.(r);
  r.emit('World ready. Press play or step through at your own pace.');
  lesson.run(r);
  return r.finish();
}
