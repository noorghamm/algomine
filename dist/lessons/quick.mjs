import { ask } from './recorder.mjs';

export default {
  id: 'quick',
  topic: 'sorting',
  name: 'Quicksort',
  time: 'O(n²) worst',
  space: 'O(n) worst stack',
  intro:
    'Choose the last block as a pivot. Move values at most the pivot to the left, place the pivot between the partitions, then sort each side recursively.',
  insight:
    'This is last-pivot Lomuto partitioning, as in the ADS example. Average time is O(n log n) over random permutations of distinct keys. Sorted or all-equal inputs cause O(n²) time and O(n) stack depth. It is not stable.',
  code: [
    'quickSort(lo, hi):',
    '  if lo >= hi: return',
    '  pivot = a[hi]; boundary = lo',
    '  for j = lo to hi − 1: compare a[j] with pivot',
    '    if a[j] <= pivot: swap(a[j], a[boundary]); boundary++',
    '  swap(a[boundary], a[hi]); pivot is now fixed',
    '  quickSort(lo, boundary − 1)',
    '  quickSort(boundary + 1, hi)',
    'return sorted array',
  ],
  quiz: [
    {
      question: 'Using the last block as pivot, what happens on an already sorted array?',
      answers: [
        'Each split is balanced',
        'Each pivot splits off just one block, giving quadratic time',
        'The algorithm immediately returns',
      ],
      correct: 1,
      reason:
        'The largest block is always the pivot, leaving a subproblem only one block shorter at each level.',
    },
    {
      question: 'After partitioning, where is the pivot?',
      answers: ['In its final sorted position', 'At index 0', 'Still at the end'],
      correct: 0,
      reason:
        'Everything left of the pivot is at most the pivot and everything right is larger, so it never moves again.',
    },
    {
      question: 'Which pivot choice avoids the sorted-input worst case in practice?',
      answers: ['A random or median-of-three pivot', 'Always the first block', 'Always the last block'],
      correct: 0,
      reason: 'Random pivots make a bad split unlikely on any fixed input, giving expected O(n log n).',
    },
  ],
  run(r) {
    const a = r.a;
    const sort = (lo, hi, depth = 0) => {
      if (lo > hi) return;
      if (lo === hi) {
        r.marked.push(lo);
        r.emit(`Single block at index ${lo}: already fixed.`, 1, [lo], { range: [lo, hi], depth });
        return;
      }
      const pivot = a[hi];
      let boundary = lo;
      r.emit(`Pivot ${pivot} at index ${hi}. Partition indices ${lo}–${hi}.`, 2, [hi], {
        pivot: hi,
        range: [lo, hi],
        depth,
      });
      for (let j = lo; j < hi; j++) {
        r.compare();
        r.emit(`Compare ${a[j]} with pivot ${pivot}. Boundary: index ${boundary}.`, 3, [j, hi], {
          pivot: hi,
          range: [lo, hi],
          depth,
          ask: ask('bool', `Is ${a[j]} at most the pivot ${pivot}?`, a[j] <= pivot),
        });
        if (a[j] <= pivot) {
          const swapped = j !== boundary;
          if (swapped) r.swap(j, boundary);
          r.emit(`Extend the ≤ ${pivot} region through index ${boundary}.`, 4, [j, boundary], {
            swapping: swapped,
            pivot: hi,
            range: [lo, hi],
            depth,
          });
          boundary++;
        } else
          r.emit(`${a[j]} is larger than the pivot. Leave it on the right.`, 3, [j], {
            pivot: hi,
            range: [lo, hi],
            depth,
          });
      }
      const swapped = boundary !== hi;
      if (swapped) r.swap(boundary, hi);
      r.marked.push(boundary);
      r.emit(`Pivot ${pivot} is fixed at index ${boundary}. Sort each side.`, 5, [boundary, hi], {
        swapping: swapped,
        pivot: boundary,
        range: [lo, hi],
        depth,
      });
      sort(lo, boundary - 1, depth + 1);
      sort(boundary + 1, hi, depth + 1);
    };
    sort(0, a.length - 1);
    r.marked = a.map((_, i) => i);
    r.emit('Sorted! Every pivot and single-block partition is in its final position.', 8);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
