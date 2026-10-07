import { ask } from './recorder.mjs';

export default {
  id: 'stack',
  topic: 'stack',
  name: 'Stack: push & pop',
  time: 'O(1) / operation',
  space: 'O(n)',
  intro: 'Push supplies onto the top of a stack, then pop them off. The last block to enter is the first to leave.',
  insight: 'LIFO means last in, first out. Stacks model undo history, expression evaluation, and the function call stack.',
  code: [
    'for value in input',
    '  stack.push(value)',
    'while stack is not empty',
    '  value = stack.pop()',
    '  append value to output',
    'return output',
  ],
  quiz: [
    {
      question: 'Push 4, then 7, then 2. Which value is popped first?',
      answers: ['4', '7', '2'],
      correct: 2,
      reason: 'The most recently pushed value is on top: 2 comes out first.',
    },
    {
      question: 'Which everyday feature is a stack a good model for?',
      answers: ['Undo history', 'A printer queue', 'A phone book'],
      correct: 0,
      reason: 'Undo reverses the most recent action first, which is exactly last in, first out.',
    },
    {
      question: 'What does popping an empty stack usually signal?',
      answers: ['An error or underflow', 'The value 0', 'The stack resets'],
      correct: 0,
      reason: 'There is nothing to remove, so implementations throw or return an error marker.',
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
      r.emit(`Push ${value}.`, 1, [r.a.length - 1]);
    }
    while (r.a.length) {
      if (r.a.length > 1) r.frames.at(-1).ask = ask('choice', 'Which value leaves next?', r.a.length - 1, r.a.map(String));
      const value = r.a.pop();
      r.output.push(value);
      r.move();
      r.emit(`Pop ${value}. Output: ${r.output.join(' → ')}.`, 3, []);
    }
    r.emit('Stack empty. The output reverses the arrival order.', 5);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify([...input].reverse()) && last.values.length === 0;
  },
};
