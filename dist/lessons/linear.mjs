import { ask } from './recorder.mjs';

export default {
  id: 'linear',
  topic: 'search',
  name: 'Linear search',
  time: 'O(n)',
  space: 'O(1)',
  target: true,
  intro: 'Inspect each block from left to right. Stop at the first matching value, or after the final block.',
  insight: 'Linear search works with unsorted data. It can stop after one comparison, but its worst case checks every value.',
  code: ['for i = 0 to n − 1', '  inspect a[i]', '  if a[i] == target: return i', 'return not found'],
  quiz: [
    {
      question: 'In the worst case, how many items does linear search inspect in an array of n items?',
      answers: ['log₂ n', '1', 'n'],
      correct: 2,
      reason: 'If the target is absent or appears only at the end, every item must be checked.',
    },
    {
      question: 'Which advantage does linear search have over binary search?',
      answers: ['It works on unsorted data', 'It is always faster', 'It uses less memory'],
      correct: 0,
      reason: 'Linear search makes no assumption about order, so it works on any array.',
    },
    {
      question: 'On average, how many items does a successful linear search inspect?',
      answers: ['About n / 2', 'About log n', 'Exactly 1'],
      correct: 0,
      reason: 'If the target is equally likely to be anywhere, the expected position is near the middle.',
    },
  ],
  run(r) {
    const a = r.a,
      target = r.target;
    let found = false;
    for (let i = 0; i < a.length; i++) {
      r.compare();
      r.emit(`Inspect index ${i}: ${a[i]}. Looking for ${target}.`, 1, [i], {
        ask: ask('bool', `Is ${a[i]} the target ${target}?`, a[i] === target),
      });
      if (a[i] === target) {
        r.marked = [i];
        r.emit(`Found ${target} at index ${i}.`, 2, [i]);
        found = true;
        break;
      }
      r.discarded.push(i);
      r.emit(`${a[i]} is not the target. Move on.`, 2, [i]);
    }
    if (!found) r.emit(`${target} is not in this dataset.`, 3);
  },
  check(input, last, target) {
    if (input.includes(target)) return last.marked.length === 1 && input[last.marked[0]] === target;
    return last.marked.length === 0;
  },
};
