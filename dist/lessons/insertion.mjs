import { ask } from './recorder.mjs';

export default {
  id: 'insertion',
  topic: 'sorting',
  name: 'Insertion sort',
  time: 'O(n²)',
  space: 'O(1)',
  intro: 'Grow a sorted section from left to right. Move each new block left until it sits in the correct position.',
  insight:
    'This adjacent-swap version is stable and in-place. Nearly sorted inputs need much less work; the best case is O(n).',
  code: [
    'for i = 1 to n − 1',
    '  j = i',
    '  while j > 0',
    '    compare a[j − 1] and a[j]',
    '    if a[j − 1] <= a[j]: break',
    '    swap(a[j − 1], a[j]); j −= 1',
  ],
  quiz: [
    {
      question: 'When is insertion sort especially efficient?',
      answers: ['When values are nearly sorted', 'When values are always reversed', 'Only when all values are unique'],
      correct: 0,
      reason: 'Nearly sorted blocks require few leftward moves, approaching linear time.',
    },
    {
      question: 'What is true about the blocks to the left of i during insertion sort?',
      answers: ['They are sorted among themselves', 'They are in final position', 'They are all smaller than a[i]'],
      correct: 0,
      reason: 'The prefix is sorted, but later blocks can still be inserted into it, so positions are not final.',
    },
    {
      question: 'Which input makes insertion sort do the most work?',
      answers: ['Reversed order', 'Sorted order', 'All equal values'],
      correct: 0,
      reason: 'Every new block must travel all the way to the front, giving n(n − 1)/2 moves.',
    },
  ],
  run(r) {
    const a = r.a;
    r.marked = [0];
    for (let i = 1; i < a.length; i++) {
      let j = i;
      r.emit(`Insert ${a[i]} into the sorted section.`, 1, [i]);
      while (j > 0) {
        r.compare();
        r.emit(`Compare ${a[j - 1]} and ${a[j]}.`, 3, [j - 1, j], {
          ask: ask('bool', `Does ${a[j]} move left past ${a[j - 1]}?`, a[j - 1] > a[j]),
        });
        if (a[j - 1] <= a[j]) {
          r.emit('Correct position found.', 4, [j]);
          break;
        }
        r.swap(j, j - 1);
        r.emit('Move this block one position left.', 5, [j - 1, j], { swapping: true });
        j--;
      }
      r.marked = Array.from({ length: i + 1 }, (_, k) => k);
      r.emit('The sorted section has grown by one block.', 0);
    }
    r.emit('Sorted! Every block is in ascending order.', 5);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
