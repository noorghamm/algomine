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
  id: 'extractMax',
  topic: 'heap',
  name: 'Extract max',
  time: 'O(log n)',
  space: 'O(1)',
  view: 'tree',
  sample: { input: [3, 9, 4, 7, 1, 6, 2] },
  intro:
    'Take the diamond off the top of the peak. The last block moves up to the root, then sinks: swap with the larger child until both children are smaller.',
  insight:
    'Moving the last value to the root keeps the tree complete, and sifting down always picks the larger child so the new parent beats both. Each extraction costs O(log n).',
  code: [
    'max = heap[0]; output max',
    'move the last value to the root; shrink the heap',
    'i = 0',
    'while i has a child larger than heap[i]',
    '  swap(i, larger child); i = larger child',
    'heap property restored; return max',
  ],
  quiz: [
    {
      question: 'Which value does extract max remove from a max heap?',
      answers: ['The root', 'The last leaf', 'The smallest value'],
      correct: 0,
      reason: 'The heap property puts the largest value at the root, so that is the value extracted.',
    },
    {
      question: 'Why is the last value moved to the root instead of a child of the root?',
      answers: [
        'It is always the second largest',
        'Removing the last slot keeps the tree complete',
        'It avoids all comparisons',
      ],
      correct: 1,
      reason: 'Filling the hole with the last array slot keeps the heap a complete tree with no gaps.',
    },
    {
      question: 'When sifting down, which child do you swap with?',
      answers: [
        'Always the left child',
        'The larger child, if it is larger than the parent',
        'The child closer to the bottom',
      ],
      correct: 1,
      reason: 'Swapping with the larger child ensures the new parent is at least as large as both children.',
    },
  ],
  prepare(r) {
    r.a = buildMaxHeap(r.a);
    r.nodes = makeTree(r.a, true);
  },
  run(r) {
    const a = r.a;
    const rounds = a.length <= 3 ? 1 : 2;
    for (let round = 0; round < rounds && a.length; round++) {
      const max = a[0];
      r.emit(`The root holds the largest value, ${max}.`, 0, [0]);
      const last = a.pop();
      r.output.push(max);
      r.move();
      if (a.length) a[0] = last;
      r.nodes = makeTree(a, true);
      r.emit(
        a.length
          ? `Send ${max} to the output and move the last value, ${last}, up to the root.`
          : `Send ${max} to the output. The heap is empty.`,
        1,
        a.length ? [0] : []
      );
      let i = 0;
      while (a.length) {
        const l = i * 2 + 1,
          rt = i * 2 + 2;
        if (l >= a.length) {
          r.emit(`${a[i]} has no children. Stop.`, 5, [i]);
          break;
        }
        const children = [l, rt].filter(c => c < a.length);
        r.compare(children.length);
        let largest = i;
        for (const c of children) if (a[c] > a[largest]) largest = c;
        r.emit(
          `Compare ${a[i]} with its child${children.length > 1 ? 'ren' : ''} ${children.map(c => a[c]).join(' and ')}.`,
          3,
          [i, ...children]
        );
        const options = [
          `Swap with left child (${a[l]})`,
          ...(rt < a.length ? [`Swap with right child (${a[rt]})`] : []),
          'Stop, the heap property holds',
        ];
        r.frames.at(-1).ask = ask(
          'choice',
          `${a[i]} at index ${i}: what happens?`,
          largest === i ? options.length - 1 : largest === l ? 0 : 1,
          options
        );
        if (largest === i) {
          r.emit(`${a[i]} is at least as large as its children. Stop.`, 5, [i]);
          break;
        }
        r.swap(i, largest);
        r.nodes = makeTree(a, true);
        r.emit(`Swap with the larger child: ${a[i]} moves up, ${a[largest]} sinks.`, 4, [i, largest], {
          swapping: true,
        });
        i = largest;
      }
    }
    r.marked = a.map((_, j) => j);
    r.emit(`Extracted ${r.output.join(', ')}. The rest is still a max heap.`, 5);
  },
  check(input, last) {
    const h = last.values;
    const out = last.output;
    if (!out.length) return false;
    const desc = sorted(input).reverse();
    return (
      same(out, desc.slice(0, out.length)) && isMaxHeap(h) && same(sorted([...h, ...out]), sorted(input))
    );
  },
};
