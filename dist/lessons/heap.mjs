import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

export default {
  id: 'heap',
  topic: 'heap',
  name: 'Build a max heap',
  time: 'O(n)',
  space: 'O(1)',
  intro:
    'Start at the last parent and sift each value down. A max heap keeps every parent at least as large as its children.',
  insight:
    'A max heap is not fully sorted. Its largest value is at the root. Bottom-up heap construction takes O(n) time.',
  code: [
    'for parent = floor(n / 2) − 1 down to 0',
    '  current = parent',
    '  choose largest of current and children',
    '  if current is largest: stop',
    '  swap(current, largest)',
    '  current = largest; repeat',
    'return max heap',
  ],
  quiz: [
    {
      question: 'What does a max heap guarantee?',
      answers: [
        'Every parent is at least as large as its children',
        'Every level is sorted left to right',
        'The smallest value is at the root',
      ],
      correct: 0,
      reason: 'The heap property applies between parents and children. Siblings need not be ordered.',
    },
    {
      question: 'Where are the children of the node at array index i?',
      answers: ['Indices 2i + 1 and 2i + 2', 'Indices i + 1 and i + 2', 'Indices i / 2 and i / 2 + 1'],
      correct: 0,
      reason: 'A complete binary tree stored level by level puts the children of i at 2i + 1 and 2i + 2.',
    },
    {
      question: 'Why is bottom-up heap construction O(n) rather than O(n log n)?',
      answers: [
        'Most nodes are near the bottom and sift only a little',
        'It skips half the nodes',
        'Comparisons are free',
      ],
      correct: 0,
      reason: 'Half the nodes are leaves, a quarter sift one level, and the sum of these costs is linear.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a, true);
  },
  run(r) {
    const a = r.a;
    for (let parent = Math.floor(a.length / 2) - 1; parent >= 0; parent--) {
      let current = parent;
      r.emit(`Sift down from parent ${a[parent]}.`, 0, [parent]);
      while (true) {
        let largest = current;
        const children = [current * 2 + 1, current * 2 + 2].filter(c => c < a.length);
        for (const child of children) {
          r.compare();
          r.emit(`Compare child ${a[child]} with ${a[largest]}.`, 2, [largest, child]);
          if (a[child] > a[largest]) largest = child;
        }
        const options = [...children.map(c => `Swap with ${a[c]}`), 'No swap needed'];
        if (children.length)
          r.frames.at(-1).ask = ask(
            'choice',
            `Parent ${a[current]}: what happens?`,
            largest === current ? options.length - 1 : children.indexOf(largest),
            options
          );
        if (largest === current) {
          r.emit('This parent satisfies the max-heap property.', 3, [current]);
          break;
        }
        r.swap(current, largest);
        r.nodes = makeTree(a, true);
        r.emit('Swap with the larger child.', 4, [current, largest], { swapping: true });
        current = largest;
      }
    }
    r.marked = a.map((_, i) => i);
    r.emit('Max heap built. Every parent is at least as large as its children.', 6);
  },
  check(input, last) {
    const h = last.values;
    for (let i = 1; i < h.length; i++) if (h[Math.floor((i - 1) / 2)] < h[i]) return false;
    return JSON.stringify([...h].sort((x, y) => x - y)) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
