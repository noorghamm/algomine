import { ask } from './recorder.mjs';

export default {
  id: 'heapsort',
  topic: 'sorting',
  name: 'Heapsort',
  time: 'O(n log n)',
  space: 'O(1)',
  view: 'bars',
  intro:
    'Turn the block row into a max heap, then pull the largest block out of the root again and again. Each extraction swaps the root with the last heap block and sifts the new root down.',
  insight:
    'The heap lives inside the array itself, so heapsort sorts in place with O(1) extra memory. Building the heap bottom-up is O(n), and each of the n extractions sifts down at most log n levels. It is not stable.',
  code: [
    'buildMaxHeap: for parent = floor(n / 2) − 1 down to 0: siftDown(parent, n)',
    'for end = n − 1 down to 1',
    '  swap(a[0], a[end]); a[end] is fixed',
    '  siftDown(0, end)',
    'siftDown(i, size):',
    '  choose largest of a[i] and its children below size',
    '  if a[i] is largest: stop',
    '  swap(a[i], a[largest]); continue from largest',
    'return sorted array',
  ],
  quiz: [
    {
      question: 'After the max heap is built, where is the largest block?',
      answers: ['At index 0, the root', 'At the last index', 'Somewhere in the middle'],
      correct: 0,
      reason:
        'A max heap keeps every parent at least as large as its children, so the root holds the maximum.',
    },
    {
      question: 'Why does heapsort swap the root with the last heap block instead of just removing it?',
      answers: [
        'So the largest block lands in its final slot and the heap shrinks by one',
        'To keep the array sorted at all times',
        'Because swapping is faster than comparing',
      ],
      correct: 0,
      reason:
        'The swap moves the maximum into the sorted suffix and leaves a smaller heap to fix with one sift down.',
    },
    {
      question: 'How much extra memory does heapsort need?',
      answers: ['O(1), it sorts in place', 'O(n) for a buffer', 'O(log n) for recursion'],
      correct: 0,
      reason: 'The heap is stored inside the array, so only a few index variables are needed.',
    },
  ],
  run(r) {
    const a = r.a;
    const n = a.length;

    // Sift a[start] down inside the heap a[0 .. size − 1].
    const siftDown = (start, size) => {
      const range = [0, size - 1];
      let current = start;
      while (true) {
        const children = [current * 2 + 1, current * 2 + 2].filter(c => c < size);
        if (!children.length) break;
        let largest = current;
        for (const child of children) {
          r.compare();
          r.emit(`Compare child ${a[child]} with ${a[largest]}.`, 5, [largest, child], { range, depth: 0 });
          if (a[child] > a[largest]) largest = child;
        }
        const options = [...children.map(c => `Swap with ${a[c]}`), 'No swap needed'];
        r.frames.at(-1).ask = ask(
          'choice',
          `Parent ${a[current]}: what happens?`,
          largest === current ? options.length - 1 : children.indexOf(largest),
          options
        );
        if (largest === current) {
          r.emit(`${a[current]} is at least as large as its children. Stop.`, 6, [current], {
            range,
            depth: 0,
          });
          break;
        }
        r.swap(current, largest);
        r.emit(`Swap ${a[largest]} down with its larger child ${a[current]}.`, 7, [current, largest], {
          swapping: true,
          range,
          depth: 0,
        });
        current = largest;
      }
    };

    const holdsAtRoot = size => [1, 2].filter(c => c < size).every(c => a[0] >= a[c]);

    // Phase 1: build the max heap bottom-up.
    const lastParent = Math.floor(n / 2) - 1;
    r.emit(`Phase 1: build a max heap. Start at the last parent, index ${Math.max(lastParent, 0)}.`, 0, [], {
      range: [0, n - 1],
      depth: 0,
    });
    for (let parent = lastParent; parent >= 0; parent--) {
      r.emit(`Sift down from ${a[parent]} at index ${parent}.`, 0, [parent], { range: [0, n - 1], depth: 0 });
      siftDown(parent, n);
    }
    r.emit(`Max heap built. The largest block ${a[0]} sits at the root.`, 1, [0], {
      range: [0, n - 1],
      depth: 0,
    });

    // Phase 2: pull the root out one block at a time.
    for (let end = n - 1; end >= 1; end--) {
      r.swap(0, end);
      r.marked.push(end);
      r.emit(`Swap root ${a[end]} with the last heap block ${a[0]}. Index ${end} is fixed.`, 2, [0, end], {
        swapping: true,
        range: [0, end - 1],
        depth: 0,
      });
      r.emit(`The heap is now indices 0 to ${end - 1}. Sift the new root ${a[0]} down.`, 3, [0], {
        range: [0, end - 1],
        depth: 0,
        ask: ask('bool', `Is ${a[0]} at least as large as both of its children?`, holdsAtRoot(end)),
      });
      siftDown(0, end);
    }
    r.marked = a.map((_, i) => i);
    r.emit('Sorted! Every root pulled from the heap landed in its final slot.', 8);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
