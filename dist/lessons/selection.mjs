import { ask } from './recorder.mjs';

export default {
  id: 'selection',
  topic: 'sorting',
  name: 'Selection sort',
  time: 'O(n²)',
  space: 'O(1)',
  intro: 'Scan the unsorted blocks for the smallest value. Move it to the front, then repeat for the remaining blocks.',
  insight:
    'Selection sort performs at most n − 1 swaps, but still needs quadratic comparisons. The usual swapping version is not stable.',
  code: [
    'for i = 0 to n − 2',
    '  smallest = i',
    '  for j = i + 1 to n − 1',
    '    if a[j] < a[smallest]: smallest = j',
    '  swap(a[i], a[smallest])',
    'return a',
  ],
  quiz: [
    {
      question: 'What does selection sort find during each pass?',
      answers: ['The largest neighboring pair', 'The smallest remaining value', 'A random pivot'],
      correct: 1,
      reason: 'Each pass selects the smallest value in the unsorted portion.',
    },
    {
      question: 'How many swaps does selection sort make at most for n blocks?',
      answers: ['n − 1', 'n²', 'n log n'],
      correct: 0,
      reason: 'One swap per pass, and there are n − 1 passes.',
    },
    {
      question: 'Does a sorted input make selection sort faster?',
      answers: ['No, it still scans every unsorted block', 'Yes, it becomes O(n)', 'Yes, it becomes O(log n)'],
      correct: 0,
      reason: 'Selection sort cannot tell the input is sorted without scanning, so comparisons stay quadratic.',
    },
  ],
  run(r) {
    const a = r.a;
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      r.emit(`Find the smallest value from index ${i} onward.`, 1, [i]);
      for (let j = i + 1; j < a.length; j++) {
        r.compare();
        r.emit(`Compare ${a[j]} with current minimum ${a[min]}.`, 2, [min, j], {
          ask: ask('bool', `Is ${a[j]} a new minimum?`, a[j] < a[min]),
        });
        if (a[j] < a[min]) {
          min = j;
          r.emit(`${a[min]} is the new minimum.`, 3, [min]);
        } else r.emit(`${a[min]} stays the minimum.`, 3, [min]);
      }
      if (min !== i) {
        r.swap(i, min);
        r.emit('Place the minimum at the front of the unsorted section.', 4, [i, min], { swapping: true });
      }
      r.marked.push(i);
    }
    r.marked = a.map((_, i) => i);
    r.emit('Sorted! Every block is in ascending order.', 5);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
