import { ask } from './recorder.mjs';

export default {
  id: 'queue',
  topic: 'stack',
  name: 'Queue: enqueue & dequeue',
  time: 'O(1) / operation',
  space: 'O(n)',
  intro: 'Add blocks at the rear and remove them from the front. The first block to enter is the first to leave.',
  insight:
    'FIFO means first in, first out. The O(1) operation cost assumes a linked queue or circular buffer, not shifting an array.',
  code: [
    'for value in input',
    '  queue.enqueue(value)',
    'while queue is not empty',
    '  value = queue.dequeue()',
    '  append value to output',
    'return output',
  ],
  quiz: [
    {
      question: 'Enqueue 4, then 7, then 2. Which value is dequeued first?',
      answers: ['4', '7', '2'],
      correct: 0,
      reason: 'A queue preserves arrival order: the earliest value, 4, leaves first.',
    },
    {
      question: 'Why is removing from the front of a plain array queue slow?',
      answers: ['Every other element must shift left', 'Arrays cannot shrink', 'The front is not stored'],
      correct: 0,
      reason: 'Shifting n − 1 elements costs O(n), which a circular buffer or linked queue avoids.',
    },
    {
      question: 'Which algorithm relies on a queue?',
      answers: ['Breadth-first search', 'Depth-first search', 'Binary search'],
      correct: 0,
      reason: 'BFS visits nodes in the order they were discovered, which a queue provides.',
    },
  ],
  prepare(r) {
    r.a = [];
  },
  run(r) {
    const source = [...r.input];
    r.emit('Storage is empty. Add each input block.', 0);
    for (const value of source) {
      r.a.push(value);
      r.move();
      r.emit(`Enqueue ${value}.`, 1, [r.a.length - 1]);
    }
    while (r.a.length) {
      if (r.a.length > 1) r.frames.at(-1).ask = ask('choice', 'Which value leaves next?', 0, r.a.map(String));
      const value = r.a.shift();
      r.output.push(value);
      r.move();
      r.emit(`Dequeue ${value}. Output: ${r.output.join(' → ')}.`, 3, []);
    }
    r.emit('Queue empty. The output preserves the arrival order.', 5);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify(input) && last.values.length === 0;
  },
};
