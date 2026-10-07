import { ask } from './recorder.mjs';

const PAIR = { '(': ')', '[': ']', '{': '}' };
const OPENERS = new Set(Object.keys(PAIR));
const CLOSERS = new Set(Object.values(PAIR));

// Reference implementation used by check(): true when every bracket is matched in order.
function balanced(chars) {
  const stack = [];
  for (const ch of chars) {
    if (OPENERS.has(ch)) stack.push(ch);
    else if (CLOSERS.has(ch)) {
      if (!stack.length || PAIR[stack.pop()] !== ch) return false;
    }
  }
  return stack.length === 0;
}

export default {
  id: 'brackets',
  topic: 'stack',
  name: 'Balanced brackets',
  time: 'O(n)',
  space: 'O(n)',
  view: 'text',
  inputKind: 'text',
  sample: { input: '{[()]}' },
  intro:
    'Read the characters left to right. Push every opener onto a stack of chests. When a closer arrives, pop the top and check that the two form a pair. Other characters are skipped.',
  insight:
    'The stack remembers which openers are still waiting, most recent on top, which is exactly the order closers must arrive in. A closer with an empty stack, a mismatched pair, or leftovers at the end all mean unbalanced.',
  code: [
    'stack = empty',
    'for ch in input',
    '  if ch is an opener: stack.push(ch)',
    '  else if ch is a closer:',
    '    if stack is empty: return false',
    '    top = stack.pop()',
    '    if pair(top) != ch: return false',
    'return stack is empty',
  ],
  quiz: [
    {
      question: 'Why does bracket matching use a stack rather than a counter?',
      answers: [
        'Closers must match the most recent unclosed opener',
        'Stacks are faster than counters',
        'Counters cannot count past 9',
      ],
      correct: 0,
      reason: 'A single counter cannot tell ( apart from [, and it cannot detect [( ]) style crossings.',
    },
    {
      question: 'The input ends and two openers are still on the stack. Verdict?',
      answers: ['Unbalanced', 'Balanced', 'It depends on which openers'],
      correct: 0,
      reason: 'Every opener must be closed, so a non-empty stack at the end means the string is unbalanced.',
    },
    {
      question: 'What should happen when a closer arrives and the stack is empty?',
      answers: ['Stop, the string is unbalanced', 'Push the closer', 'Skip it and continue'],
      correct: 0,
      reason: 'There is no opener for that closer to match, so the check fails immediately.',
    },
  ],
  run(r) {
    const chars = r.input;
    const stack = []; // entries: { ch, index }
    const row = (active = []) => ({
      text: { rows: [{ label: 'INPUT', chars, active, marked: [...r.marked], discarded: [...r.discarded] }] },
      trays: [{ label: 'STACK', values: stack.map(s => s.ch) }],
    });
    r.emit('The stack is empty. Read the input left to right.', 0, [], row());

    let verdict = null;
    for (let i = 0; i < chars.length && verdict === null; i++) {
      const ch = chars[i];
      if (!OPENERS.has(ch) && !CLOSERS.has(ch)) {
        r.discarded.push(i);
        r.emit(`'${ch}' is not a bracket. Skip it.`, 1, [i], row([i]));
        continue;
      }
      const top = stack.at(-1);
      const answer = OPENERS.has(ch) ? 0 : top && PAIR[top.ch] === ch ? 1 : 2;
      r.emit(
        `Read '${ch}' at index ${i}.${top ? ` Top of stack: '${top.ch}'.` : ' Stack is empty.'}`,
        1,
        [i],
        {
          ...row([i]),
          ask: ask('choice', `What happens with '${ch}'?`, answer, [
            'Push it',
            'Pop and match',
            'Mismatch, stop',
          ]),
        }
      );
      if (OPENERS.has(ch)) {
        stack.push({ ch, index: i });
        r.move();
        r.emit(`'${ch}' is an opener. Push it. Stack: ${stack.map(s => s.ch).join(' ')}.`, 2, [i], row([i]));
        continue;
      }
      if (!top) {
        r.discarded.push(i);
        r.emit(`'${ch}' is a closer but the stack is empty. Nothing opened it.`, 4, [i], row([i]));
        verdict = `Not balanced: '${ch}' at index ${i} has no opener.`;
        break;
      }
      stack.pop();
      r.move();
      r.compare();
      if (PAIR[top.ch] === ch) {
        r.marked.push(top.index, i);
        r.emit(`Pop '${top.ch}'. It pairs with '${ch}'. Match.`, 6, [top.index, i], row([top.index, i]));
      } else {
        r.discarded.push(top.index, i);
        r.emit(
          `Pop '${top.ch}'. It does not pair with '${ch}'. Mismatch, stop.`,
          6,
          [top.index, i],
          row([top.index, i])
        );
        verdict = `Not balanced: '${top.ch}' at index ${top.index} is closed by '${ch}' at index ${i}.`;
      }
    }

    if (verdict === null) {
      if (stack.length) {
        r.discarded.push(...stack.map(s => s.index));
        verdict = `Not balanced: ${stack.length} opener${stack.length === 1 ? '' : 's'} left on the stack (${stack.map(s => s.ch).join(' ')}) with no closer.`;
      } else {
        verdict = 'Balanced. Every opener met its closer in the right order and the stack is empty.';
      }
    }
    r.emit(verdict, 7, [], row());
  },
  check(input, last) {
    return last.message.startsWith('Balanced') === balanced(input);
  },
};
