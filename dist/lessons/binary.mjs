import { ask } from './recorder.mjs';

export default {
  id: 'binary',
  topic: 'search',
  name: 'Binary search',
  time: 'O(log n)',
  space: 'O(1)',
  target: true,
  intro:
    'Search sorted blocks by inspecting the middle value. Eliminate the half that cannot contain your target, then repeat.',
  insight:
    'Binary search requires sorted data. Each comparison roughly halves the remaining search area. Index labels start at zero.',
  code: [
    'left = 0; right = n − 1',
    'while left <= right',
    '  mid = floor((left + right) / 2)',
    '  if a[mid] == target: return mid',
    '  if a[mid] < target: left = mid + 1',
    '  else: right = mid − 1',
    'return not found',
  ],
  quiz: [
    {
      question: 'What must be true before binary search can work correctly?',
      answers: ['The values must be unique', 'The values must be sorted', 'The length must be even'],
      correct: 1,
      reason: 'Sorted order is what makes it safe to discard half the remaining values.',
    },
    {
      question: 'How many comparisons does binary search need at most for 1,000 sorted values?',
      answers: ['About 10', 'About 500', 'About 1,000'],
      correct: 0,
      reason: 'Each comparison halves the range, and 2¹⁰ = 1,024 covers 1,000 values.',
    },
    {
      question: 'The middle value is smaller than the target. Which half is discarded?',
      answers: ['The left half including the middle', 'The right half', 'Neither, inspect both'],
      correct: 0,
      reason: 'Everything at or before the middle is also smaller than the target, so it cannot hold it.',
    },
  ],
  prepare(r) {
    r.a.sort((x, y) => x - y);
  },
  run(r) {
    const a = r.a,
      target = r.target;
    let l = 0,
      h = a.length - 1,
      found = false;
    while (l <= h) {
      const mid = Math.floor((l + h) / 2);
      r.compare();
      r.frames.at(-1).ask = ask('index', 'Which index is inspected next?', mid);
      r.emit(`Middle index ${mid} contains ${a[mid]}. Target: ${target}.`, 2, [mid], {
        bounds: [l, h],
        ask: ask(
          'choice',
          `${a[mid]} versus target ${target}: what happens?`,
          a[mid] === target ? 0 : a[mid] < target ? 1 : 2,
          ['Found it', 'Search the right half', 'Search the left half']
        ),
      });
      if (a[mid] === target) {
        r.marked = [mid];
        r.emit(`Found ${target} at index ${mid}.`, 3, [mid]);
        found = true;
        break;
      }
      if (a[mid] < target) {
        r.discarded.push(...Array.from({ length: mid - l + 1 }, (_, k) => l + k));
        l = mid + 1;
        r.emit('Target is larger. Search the right half.', 4, [], { bounds: [l, h] });
      } else {
        r.discarded.push(...Array.from({ length: h - mid + 1 }, (_, k) => mid + k));
        h = mid - 1;
        r.emit('Target is smaller. Search the left half.', 5, [], { bounds: [l, h] });
      }
    }
    if (!found) r.emit(`${target} is not in this dataset.`, 6);
  },
  check(input, last, target) {
    const data = [...input].sort((x, y) => x - y);
    if (data.includes(target)) return last.marked.length === 1 && data[last.marked[0]] === target;
    return last.marked.length === 0;
  },
};
