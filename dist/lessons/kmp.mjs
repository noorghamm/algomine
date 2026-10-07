import { ask } from './recorder.mjs';
import { occurrences } from './naive.mjs';

const range = (from, count) => Array.from({ length: count }, (_, i) => from + i);

export default {
  id: 'kmp',
  topic: 'strings',
  name: 'Knuth-Morris-Pratt',
  time: 'O(n + m)',
  space: 'O(m)',
  view: 'text',
  target: true,
  inputKind: 'text',
  sample: { input: 'ababcabab', target: 'abab' },
  intro:
    'First study the pattern on its own and write a border table. Then scan the text once, and after a mismatch let the table say how far the pattern may jump.',
  insight:
    'A border is a prefix of the pattern that is also a suffix. The runes already matched contain that border, so the pattern can shift past them without rereading the text. The text index never moves backwards.',
  code: [
    'border[0] = 0, k = 0',
    'for i = 1 to m − 1',
    '  while k > 0 and pattern[i] != pattern[k]: k = border[k − 1]',
    '  if pattern[i] == pattern[k]: k = k + 1',
    '  border[i] = k',
    'j = 0; for i = 0 to n − 1',
    '  while j > 0 and text[i] != pattern[j]: j = border[j − 1]',
    '  if text[i] == pattern[j]: j = j + 1',
    '  if j == m: record offset i − m + 1, then j = border[m − 1]',
    'return recorded offsets',
  ],
  quiz: [
    {
      question: 'What does border[i] store in the KMP table?',
      answers: [
        'The length of the longest proper prefix of pattern[0..i] that is also its suffix',
        'The index of the next mismatch',
        'How many times pattern[i] appears in the text',
      ],
      correct: 0,
      reason: 'The border length tells how much of the matched part can be reused after a mismatch.',
    },
    {
      question: 'Why does the text index never move backwards in KMP?',
      answers: [
        'The border table already knows what the skipped runes were',
        'The text is copied into a buffer first',
        'KMP only works on sorted text',
      ],
      correct: 0,
      reason:
        'The runes matched so far are a prefix of the pattern, so the table can realign without rereading them.',
    },
    {
      question: 'What is the total running time of KMP for text length n and pattern length m?',
      answers: ['O(n · m)', 'O(n + m)', 'O(m log n)'],
      correct: 1,
      reason:
        'Building the table costs O(m) and the scan costs O(n), because every step moves an index forward.',
    },
  ],
  run(r) {
    const text = r.input,
      pattern = [...String(r.target ?? '')],
      n = text.length,
      m = pattern.length;
    const border = [];
    const found = [];
    const tray = k => ({
      label: 'BORDER',
      values: border.map(v => v),
      ...(k === null ? {} : { active: [k] }),
    });
    const shiftOptions = shift => {
      const base = Math.max(1, shift - 1);
      return { answer: shift - base, options: [base, base + 1, base + 2].map(v => `Shift by ${v}`) };
    };

    r.emit(
      `Pattern "${pattern.join('')}". Step one: build its border table before touching the text.`,
      0,
      [],
      {
        text: { rows: [{ label: 'PATTERN', chars: pattern }] },
        trays: [tray(null)],
      }
    );
    if (!m) {
      r.emit('The pattern is empty, so there is nothing to look for.', 9, [], {
        text: { rows: [{ label: 'TEXT', chars: text }] },
        trays: [tray(null)],
      });
      return;
    }

    // Phase one: the border (failure) table, shown as the pattern sliding under itself.
    const tableRows = (i, k) => ({
      rows: [
        { label: 'PATTERN', chars: pattern, active: [i], marked: range(i - k, k) },
        { label: 'PREFIX', chars: pattern, offset: i - k, active: [k], marked: range(0, k) },
      ],
    });
    border[0] = 0;
    let k = 0;
    r.emit('border[0] = 0. A single rune has no proper prefix that is also a suffix.', 0, [], {
      text: tableRows(0, 0),
      trays: [tray(0)],
    });
    for (let i = 1; i < m; i++) {
      while (true) {
        r.compare();
        r.emit(`Compare pattern[${i}] = "${pattern[i]}" with pattern[${k}] = "${pattern[k]}".`, 2, [], {
          text: tableRows(i, k),
          trays: [tray(null)],
          ask: ask('bool', `Do "${pattern[i]}" and "${pattern[k]}" match?`, pattern[i] === pattern[k]),
        });
        if (pattern[i] === pattern[k]) {
          k++;
          r.emit(`Match. The border grows to ${k}.`, 3, [], { text: tableRows(i, k), trays: [tray(null)] });
          break;
        }
        if (k === 0) {
          r.emit('Mismatch and k is already 0. No border ends here.', 2, [], {
            text: tableRows(i, 0),
            trays: [tray(null)],
          });
          break;
        }
        const next = border[k - 1];
        r.emit(`Mismatch. Fall back: k = border[${k - 1}] = ${next}.`, 2, [], {
          text: tableRows(i, next),
          trays: [tray(k - 1)],
        });
        k = next;
      }
      border[i] = k;
      r.emit(`border[${i}] = ${k}.`, 4, [], { text: tableRows(i, k), trays: [tray(i)] });
    }
    r.emit(`Border table ready: [${border.join(', ')}]. Step two: scan the text once.`, 5, [], {
      text: {
        rows: [
          { label: 'TEXT', chars: text },
          { label: 'PATTERN', chars: pattern, offset: 0 },
        ],
      },
      trays: [tray(null)],
    });

    // Phase two: scan the text. The pattern row sits at offset i − j.
    const scanRows = (i, j, mismatchAt = null) => ({
      rows: [
        {
          label: 'TEXT',
          chars: text,
          active: mismatchAt === null && i < n ? [i] : [],
          marked: [...found.flatMap(s => range(s, m)), ...range(i - j, j)],
          discarded: mismatchAt === null ? [] : [mismatchAt],
        },
        {
          label: 'PATTERN',
          chars: pattern,
          offset: i - j,
          active: mismatchAt === null && j < m ? [j] : [],
          marked: range(0, j),
          discarded: [],
        },
      ],
    });
    let j = 0;
    for (let i = 0; i < n; i++) {
      while (true) {
        r.compare();
        r.emit(`Compare text[${i}] = "${text[i]}" with pattern[${j}] = "${pattern[j]}".`, 7, [i], {
          text: scanRows(i, j),
          trays: [tray(null)],
          ask: ask('bool', `Do "${text[i]}" and "${pattern[j]}" match?`, text[i] === pattern[j]),
        });
        if (text[i] === pattern[j]) {
          j++;
          r.emit(`Match. ${j} of ${m} pattern runes line up.`, 7, range(i - j + 1, j), {
            text: scanRows(i + 1, j),
            trays: [tray(null)],
          });
          break;
        }
        if (j === 0) {
          r.emit(`Mismatch with nothing matched yet. Move to text[${i + 1}].`, 6, [i], {
            text: scanRows(i, 0, i),
            trays: [tray(null)],
          });
          break;
        }
        const next = border[j - 1],
          shift = j - next,
          q = shiftOptions(shift);
        r.emit(`Mismatch after ${j} matched runes. Look up border[${j - 1}] = ${next}.`, 6, [i], {
          text: scanRows(i, j, i),
          trays: [tray(j - 1)],
          ask: ask(
            'choice',
            'How far does the pattern shift? The text index stays put.',
            q.answer,
            q.options
          ),
        });
        j = next;
        r.emit(
          `j becomes ${next}: the pattern shifts right by ${shift}. text[${i}] is compared again.`,
          6,
          [i],
          {
            text: scanRows(i, j),
            trays: [tray(null)],
          }
        );
      }
      if (j === m) {
        const offset = i - m + 1;
        found.push(offset);
        r.output = [...found];
        r.marked = found.flatMap(s => range(s, m));
        j = border[m - 1];
        r.emit(
          `Full match at offset ${offset}! Reuse border[${m - 1}] = ${j}: the pattern shifts by ${m - j} and the scan continues.`,
          8,
          range(offset, m),
          { text: scanRows(i + 1, j), trays: [tray(m - 1)] }
        );
      }
    }
    r.emit(
      found.length
        ? `Done. The pattern occurs at offset${found.length > 1 ? 's' : ''} ${found.join(', ')}. Total: ${r.comparisons} comparisons, text index never went back.`
        : `Done. The pattern never occurs in this text. Total: ${r.comparisons} comparisons in a single pass.`,
      9,
      [],
      { text: scanRows(found.length ? found.at(-1) : Math.max(0, n - m), 0), trays: [tray(null)] }
    );
  },
  check(input, last, target) {
    return JSON.stringify(last.output) === JSON.stringify(occurrences(input, [...String(target ?? '')]));
  },
};
