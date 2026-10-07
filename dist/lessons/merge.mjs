import { ask } from './recorder.mjs';

export default {
  id: 'merge',
  topic: 'sorting',
  name: 'Merge sort',
  time: 'Θ(n log n)',
  space: 'O(n)',
  intro:
    'Split the block row into halves until each section has one block. Merge neighboring sorted sections by repeatedly taking the smaller front block.',
  insight:
    'The merge buffer is extra working memory. Taking the left block on ties makes this version stable. Each level does linear work across O(log n) levels: T(n) = 2T(n/2) + Θ(n).',
  code: [
    'mergeSort(lo, hi):',
    '  if lo >= hi: return',
    '  mid = floor((lo + hi) / 2)',
    '  mergeSort(lo, mid); mergeSort(mid + 1, hi)',
    '  copy both sorted halves into a buffer',
    '  compare the front blocks; take left on ties',
    '  write the smaller block; drain any remaining half',
    'return sorted array',
  ],
  quiz: [
    {
      question: 'Why does this merge sort choose the left block when two keys are equal?',
      answers: ['To avoid allocating memory', 'To preserve their original relative order', 'To reduce the recursion depth'],
      correct: 1,
      reason: 'Taking equal keys from the left half first preserves stability across the merge.',
    },
    {
      question: 'How many levels of splitting does merge sort create for n blocks?',
      answers: ['About log₂ n', 'About n', 'Exactly 2'],
      correct: 0,
      reason: 'Each level halves the section size, so it takes log₂ n halvings to reach single blocks.',
    },
    {
      question: 'What is the main cost of merge sort compared with quicksort?',
      answers: ['Extra O(n) memory for the buffer', 'Quadratic worst case', 'It cannot handle duplicates'],
      correct: 0,
      reason: 'Merging needs a buffer the size of the section being merged, so merge sort is not in-place.',
    },
  ],
  run(r) {
    const a = r.a;
    const sort = (lo, hi, depth = 0) => {
      if (lo >= hi) return;
      const mid = Math.floor((lo + hi) / 2);
      r.emit(`Split indices ${lo}–${hi} at ${mid}. Recursion depth ${depth}.`, 2, [lo, hi], { range: [lo, hi], depth });
      sort(lo, mid, depth + 1);
      sort(mid + 1, hi, depth + 1);
      const left = a.slice(lo, mid + 1),
        right = a.slice(mid + 1, hi + 1);
      let i = 0,
        j = 0,
        k = lo;
      r.aux = [...left, ...right];
      r.emit(`Merge sorted runs [${left.join(', ')}] and [${right.join(', ')}].`, 4, [lo, mid + 1], {
        range: [lo, hi],
        depth,
      });
      while (i < left.length || j < right.length) {
        const both = i < left.length && j < right.length;
        if (both) {
          r.compare();
          r.emit(`Compare ${left[i]} (left) and ${right[j]} (right). Take the left on a tie.`, 5, [], {
            range: [lo, hi],
            depth,
            ask: ask('choice', 'Which block is written next?', left[i] <= right[j] ? 0 : 1, [
              `${left[i]} from the left`,
              `${right[j]} from the right`,
            ]),
          });
        }
        const fromLeft = j === right.length || (i < left.length && left[i] <= right[j]);
        a[k] = fromLeft ? left[i++] : right[j++];
        r.move();
        r.aux = [...left.slice(i), ...right.slice(j)];
        r.emit(`Write ${a[k]} at index ${k} from the ${fromLeft ? 'left' : 'right'} buffer.`, 6, [k], {
          range: [lo, hi],
          depth,
        });
        k++;
      }
      r.emit(
        `Indices ${lo}–${hi} are now a sorted run.`,
        4,
        Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
        { range: [lo, hi], depth }
      );
    };
    sort(0, a.length - 1);
    r.aux = [];
    r.marked = a.map((_, i) => i);
    r.emit('Sorted! The final merge joins every block into one sorted run.', 7);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
