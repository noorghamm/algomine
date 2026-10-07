import { ask } from './recorder.mjs';
import { makeTree, sorted, same } from './shared.mjs';

// Bottom-up max heap construction, with no frames. The lesson starts from a finished heap.
function buildMaxHeap(values) {
  const a = [...values];
  for (let parent = Math.floor(a.length / 2) - 1; parent >= 0; parent--) {
    let i = parent;
    while (true) {
      let largest = i;
      for (const c of [i * 2 + 1, i * 2 + 2]) if (c < a.length && a[c] > a[largest]) largest = c;
      if (largest === i) break;
      [a[i], a[largest]] = [a[largest], a[i]];
      i = largest;
    }
  }
  return a;
}

const isMaxHeap = h => h.every((v, i) => i === 0 || h[Math.floor((i - 1) / 2)] >= v);

export default {
  id: 'heapInsert',
  topic: 'heap',
  name: 'Heap insert',
  time: 'O(log n)',
  space: 'O(1)',
  view: 'tree',
  target: true,
  sample: { input: [4, 10, 3, 5, 1, 8, 6], target: 9 },
  intro:
    'Drop a new block into the next free slot at the bottom of Diamond Peak, then let it climb: swap with the parent while the new value is larger.',
  insight:
    'The heap stays a complete tree because the new value always lands in the next array slot. Sifting up touches one node per level, so an insert costs O(log n) comparisons.',
  code: [
    'append value at the end of the heap',
    'i = last index',
    'while i > 0 and heap[i] > heap[parent(i)]',
    '  swap(i, parent(i))',
    '  i = parent(i)',
    'return heap',
  ],
  quiz: [
    {
      question: 'Where does a new value go first when inserted into a heap?',
      answers: ['At the root', 'In the next free slot at the bottom', 'Wherever it is in sorted order'],
      correct: 1,
      reason: 'Appending keeps the tree complete, and sifting up then restores the heap property.',
    },
    {
      question: 'When does sifting up stop?',
      answers: [
        'When the value reaches a leaf',
        'When the value is not larger than its parent, or it is the root',
        'After exactly one swap',
      ],
      correct: 1,
      reason: 'A parent at least as large as the new value means the heap property already holds above it.',
    },
    {
      question: 'What is the parent index of array index i in a heap?',
      answers: ['floor((i − 1) / 2)', 'i / 2 + 1', '2i + 1'],
      correct: 0,
      reason:
        'Level-order storage puts the children of p at 2p + 1 and 2p + 2, so the inverse is floor((i − 1) / 2).',
    },
  ],
  prepare(r) {
    r.a = buildMaxHeap(r.a);
    r.nodes = makeTree(r.a, true);
  },
  run(r) {
    const a = r.a;
    const value = r.target;
    r.emit(`The heap is ready. Incoming value: ${value}.`, 0, [], { incoming: value });
    a.push(value);
    let i = a.length - 1;
    r.nodes = makeTree(a, true);
    r.move();
    r.emit(`Place ${value} in the next free slot, index ${i}.`, 1, [i]);
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      r.compare();
      r.emit(`Compare ${a[i]} with its parent ${a[p]}.`, 2, [i, p], { activeEdge: [p, i] });
      r.frames.at(-1).ask = ask(
        'bool',
        `Is ${a[i]} larger than its parent ${a[p]}? If so, they swap.`,
        a[i] > a[p]
      );
      if (!(a[i] > a[p])) {
        r.emit(`${a[p]} is at least as large. ${a[i]} stays where it is.`, 2, [i]);
        break;
      }
      r.swap(i, p);
      r.nodes = makeTree(a, true);
      r.emit(`Swap: ${a[p]} climbs to index ${p}.`, 3, [p, i], { swapping: true });
      i = p;
      if (i === 0) r.emit(`${a[0]} reached the root.`, 4, [0]);
    }
    r.marked = a.map((_, j) => j);
    r.emit('Heap property restored. Every parent is at least as large as its children.', 5);
  },
  check(input, last, target) {
    const h = last.values;
    return isMaxHeap(h) && same(sorted(h), sorted([...input, target]));
  },
};
