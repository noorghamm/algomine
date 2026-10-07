import { ask } from './recorder.mjs';

// Every offset where `pattern` occurs in `text`, overlapping matches included.
// An empty pattern records nothing, so the lesson and the check agree.
export function occurrences(text, pattern) {
  const out = [];
  if (!pattern.length) return out;
  for (let s = 0; s + pattern.length <= text.length; s++) {
    let j = 0;
    while (j < pattern.length && text[s + j] === pattern[j]) j++;
    if (j === pattern.length) out.push(s);
  }
  return out;
}

const range = (from, count) => Array.from({ length: count }, (_, i) => from + i);

export default {
  id: 'naive',
  topic: 'strings',
  name: 'Brute-force matching',
  time: 'O(n · m)',
  space: 'O(1)',
  view: 'text',
  target: true,
  inputKind: 'text',
  sample: { input: 'ababcabab', target: 'abab' },
  intro:
    'Slide the pattern along the text one rune at a time. At each offset compare left to right and stop at the first rune that disagrees.',
  insight:
    'After a mismatch brute force forgets everything it learned and shifts by one. With n text runes and m pattern runes the worst case costs about n times m comparisons.',
  code: [
    'for offset = 0 to n − m',
    '  j = 0',
    '  while j < m and text[offset + j] == pattern[j]',
    '    j = j + 1',
    '  if j == m: record offset',
    '  shift the pattern right by one',
    'return recorded offsets',
  ],
  quiz: [
    {
      question: 'How far does brute-force matching shift the pattern after a mismatch?',
      answers: ['Always by one', 'Past the mismatched rune', 'To the end of the text'],
      correct: 0,
      reason: 'Brute force never reuses what it learned, so it simply tries the next offset.',
    },
    {
      question: 'What is the worst-case cost of brute-force matching for text length n and pattern length m?',
      answers: ['O(n + m)', 'O(n · m)', 'O(m log n)'],
      correct: 1,
      reason: 'Every one of the n − m + 1 offsets may need up to m comparisons before a mismatch.',
    },
    {
      question: 'Can brute force find overlapping occurrences, like abab twice inside ababab?',
      answers: [
        'Yes, it tries every offset',
        'No, it skips past each match',
        'Only if the pattern is a palindrome',
      ],
      correct: 0,
      reason: 'Shifting by one after a match means the next offset is tried as well, so overlaps are found.',
    },
  ],
  run(r) {
    const text = r.input,
      pattern = [...String(r.target ?? '')],
      n = text.length,
      m = pattern.length;
    const found = [];
    const rows = (offset, j, mismatchAt = null) => ({
      rows: [
        {
          label: 'TEXT',
          chars: text,
          active: mismatchAt === null && j < m && offset + j < n ? [offset + j] : [],
          marked: [...found.flatMap(s => range(s, m)), ...range(offset, j)],
          discarded: mismatchAt === null ? [] : [offset + mismatchAt],
        },
        {
          label: 'PATTERN',
          chars: pattern,
          offset,
          active: mismatchAt === null && j < m ? [j] : [],
          marked: range(0, j),
          discarded: mismatchAt === null ? [] : [mismatchAt],
        },
      ],
    });
    r.emit(
      `Look for the rune pattern "${pattern.join('')}" inside the text. Try every offset from the left.`,
      0,
      [],
      {
        text: rows(0, 0),
      }
    );
    if (!m) {
      r.emit('The pattern is empty, so there is nothing to look for.', 6, [], { text: rows(0, 0) });
      return;
    }
    if (m > n) {
      r.emit(`The pattern has ${m} runes but the text only ${n}. It cannot fit anywhere.`, 6, [], {
        text: rows(0, 0),
      });
      return;
    }
    for (let offset = 0; offset + m <= n; offset++) {
      let j = 0;
      r.emit(`Align the pattern at offset ${offset}. Start comparing from its first rune.`, 1, [offset], {
        text: rows(offset, 0),
      });
      while (j < m) {
        const t = text[offset + j],
          p = pattern[j];
        r.compare();
        r.emit(`Compare text[${offset + j}] = "${t}" with pattern[${j}] = "${p}".`, 2, [offset + j], {
          text: rows(offset, j),
          ask: ask('bool', `Do "${t}" and "${p}" match?`, t === p),
        });
        if (t !== p) {
          r.emit(`Mismatch: "${t}" is not "${p}". This offset is ruled out.`, 5, [offset + j], {
            text: rows(offset, j, j),
            ask: ask('choice', 'How far does brute force shift the pattern now?', 0, [
              'Shift by one',
              'Shift past the mismatch',
            ]),
          });
          break;
        }
        j++;
        r.emit(`Match. ${j} of ${m} runes agree so far.`, 3, range(offset, j), { text: rows(offset, j) });
      }
      if (j === m) {
        found.push(offset);
        r.output = [...found];
        r.marked = found.flatMap(s => range(s, m));
        r.emit(
          `Full match! The pattern occurs at offset ${offset}. Shift by one and keep looking.`,
          4,
          range(offset, m),
          {
            text: rows(offset, m),
          }
        );
      }
    }
    r.emit(
      found.length
        ? `Done. The pattern occurs at offset${found.length > 1 ? 's' : ''} ${found.join(', ')} after ${r.comparisons} comparisons.`
        : `Done. The pattern never occurs in this text. ${r.comparisons} comparisons were spent to learn that.`,
      6,
      [],
      { text: rows(Math.max(0, n - m), 0) }
    );
  },
  check(input, last, target) {
    return JSON.stringify(last.output) === JSON.stringify(occurrences(input, [...String(target ?? '')]));
  },
};
