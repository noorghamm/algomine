import { ask } from './recorder.mjs';

export default {
  id: 'bubble',
  topic: 'sorting',
  name: 'Bubble sort',
  time: 'O(n²)',
  space: 'O(1)',
  intro:
    'Compare neighboring blocks. Swap them when the left value is larger. After each pass, the largest remaining value is in its final position.',
  insight:
    'An in-place, stable sort. These swaps are easy to follow, but repeated passes make it slow for large inputs.',
  code: [
    'for end = n − 1 down to 1',
    '  for i = 0 to end − 1',
    '    compare a[i] and a[i + 1]',
    '    if a[i] > a[i + 1]',
    '      swap(a[i], a[i + 1])',
    'return a',
  ],
  quiz: [
    {
      question: 'After the first full pass of bubble sort, which value is guaranteed to be in its final position?',
      answers: ['The largest value', 'The smallest value', 'The middle value'],
      correct: 0,
      reason: 'Each comparison pushes the larger neighbor right. The largest value reaches the last position.',
    },
    {
      question: 'Bubble sort makes no swaps during a full pass. What can you conclude?',
      answers: ['The array is sorted', 'The array is reversed', 'Nothing yet'],
      correct: 0,
      reason: 'If no neighbors are out of order, every neighbor pair is ordered, so the whole array is sorted.',
    },
    {
      question: 'How many passes does bubble sort need in the worst case for n blocks?',
      answers: ['n − 1', 'log n', '1'],
      correct: 0,
      reason: 'Each pass fixes at least one block at the end, so n − 1 passes guarantee a sorted array.',
    },
  ],
  run(r) {
    const a = r.a;
    for (let end = a.length - 1; end > 0; end--) {
      for (let i = 0; i < end; i++) {
        r.compare();
        r.emit(`Compare ${a[i]} and ${a[i + 1]}.`, 2, [i, i + 1], {
          ask: ask('bool', `Should ${a[i]} and ${a[i + 1]} swap?`, a[i] > a[i + 1]),
        });
        if (a[i] > a[i + 1]) {
          r.swap(i, i + 1);
          r.emit('Swap the neighbors. The larger value moves right.', 4, [i, i + 1], { swapping: true });
        } else r.emit('Already in order. Continue to the next pair.', 3, [i, i + 1]);
      }
      r.marked.push(end);
      r.emit(`${a[end]} is in its final position.`, 0);
    }
    r.marked = a.map((_, i) => i);
    r.emit('Sorted! Every block is in ascending order.', 5);
  },
  check(input, last) {
    const expected = [...input].sort((x, y) => x - y);
    return JSON.stringify(last.values) === JSON.stringify(expected);
  },
};
