import { ask } from './recorder.mjs';

// Levenshtein distance computed independently of the lesson, used by check().
export function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

export default {
  id: 'editDistance',
  topic: 'strings',
  name: 'Edit distance',
  time: 'O(n · m)',
  space: 'O(n · m)',
  view: 'grid',
  target: true,
  inputKind: 'text',
  sample: { input: 'kitten', target: 'sitting' },
  intro:
    'How many single-rune edits turn one word into another? Fill a table where each cell holds the distance between a prefix of the input and a prefix of the target.',
  insight:
    'Each cell depends only on its three neighbours: above means delete, left means insert, diagonal means substitute, or keep when the runes already agree. The bottom-right cell is the answer and the path back to the corner is the edit script.',
  code: [
    'd[i][0] = i and d[0][j] = j',
    'for i = 1 to n, for j = 1 to m',
    '  if a[i − 1] == b[j − 1]: d[i][j] = d[i − 1][j − 1]',
    '  else d[i][j] = 1 + min(d[i − 1][j], d[i][j − 1], d[i − 1][j − 1])',
    'distance = d[n][m]',
    'walk back from d[n][m] to d[0][0] to read the edits',
  ],
  quiz: [
    {
      question: 'What does cell d[i][j] of the table mean?',
      answers: [
        'The distance between the first i runes of the input and the first j runes of the target',
        'Whether rune i equals rune j',
        'The number of runes shared by both words',
      ],
      correct: 0,
      reason: 'Each cell solves a smaller version of the same problem on prefixes of both words.',
    },
    {
      question: 'Which neighbour does a cell copy when the two runes match?',
      answers: ['The cell above', 'The cell to the left', 'The diagonal cell, with no extra cost'],
      correct: 2,
      reason: 'Matching runes need no edit, so the distance is the same as for both prefixes without them.',
    },
    {
      question: 'What do the first row and first column of the table hold?',
      answers: [
        'All zeros',
        'The prefix lengths, because turning a word into nothing costs one delete per rune',
        'Random values',
      ],
      correct: 1,
      reason: 'Reaching an empty word takes exactly one edit per rune, so d[i][0] = i and d[0][j] = j.',
    },
  ],
  run(r) {
    const a = r.input,
      b = [...String(r.target ?? '')],
      n = a.length,
      m = b.length;
    const d = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));
    const rowLabels = ['ε', ...a],
      colLabels = ['ε', ...b];
    const grid = (active = null, extra = {}) => ({
      cells: d.map(row => [...row]),
      rowLabels,
      colLabels,
      ...(active ? { active } : {}),
      ...extra,
    });
    const word = chars => (chars.length ? `"${chars.join('')}"` : 'the empty word');

    r.emit(
      `Measure how many edits turn ${word(a)} into ${word(b)}. Rows are the input, columns the target.`,
      0,
      [],
      {
        grid: grid(),
      }
    );
    for (let j = 0; j <= m; j++) d[0][j] = j;
    r.emit('Row 0: turning nothing into the first j target runes takes j inserts.', 0, [], {
      grid: grid(null, { marked: d[0].map((_, j) => [0, j]) }),
    });
    for (let i = 1; i <= n; i++) d[i][0] = i;
    r.emit('Column 0: turning the first i input runes into nothing takes i deletes.', 0, [], {
      grid: grid(null, { marked: d.map((_, i) => [i, 0]) }),
    });

    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        const up = d[i - 1][j],
          left = d[i][j - 1],
          diag = d[i - 1][j - 1],
          same = a[i - 1] === b[j - 1];
        const value = same ? diag : 1 + Math.min(up, left, diag);
        r.compare();
        const look = r.emit(
          same
            ? `Cell [${i}][${j}]: "${a[i - 1]}" and "${b[j - 1]}" agree. Above ${up}, left ${left}, diagonal ${diag}.`
            : `Cell [${i}][${j}]: "${a[i - 1]}" and "${b[j - 1]}" differ. Above ${up}, left ${left}, diagonal ${diag}.`,
          1,
          [i - 1],
          {
            grid: grid([i, j], {
              marked: [
                [i - 1, j],
                [i, j - 1],
                [i - 1, j - 1],
              ],
            }),
          }
        );
        if (same || i === j) {
          const opts = value === 0 ? [0, 1, 2] : [value - 1, value, value + 1];
          const rot = (i + j) % 3,
            options = [...opts.slice(rot), ...opts.slice(0, rot)];
          look.ask = ask(
            'choice',
            'What value goes in this cell?',
            options.indexOf(value),
            options.map(String)
          );
        }
        d[i][j] = value;
        r.emit(
          same
            ? `Runes agree, so copy the diagonal: d[${i}][${j}] = ${value}.`
            : `1 + min(delete ${up}, insert ${left}, substitute ${diag}) = ${value}.`,
          same ? 2 : 3,
          [i - 1],
          { grid: grid([i, j]) }
        );
      }

    const distance = d[n][m];
    r.emit(
      `The bottom-right cell holds the answer: distance ${distance}. Now walk back to read the edits.`,
      4,
      [],
      {
        grid: grid([n, m]),
      }
    );
    const path = [[n, m]],
      edits = [];
    let i = n,
      j = m;
    while (i > 0 || j > 0) {
      let step;
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
        step = `keep "${a[i - 1]}"`;
        i--;
        j--;
      } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
        step = `replace "${a[i - 1]}" with "${b[j - 1]}"`;
        i--;
        j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        step = `delete "${a[i - 1]}"`;
        i--;
      } else {
        step = `insert "${b[j - 1]}"`;
        j--;
      }
      edits.unshift(step);
      path.unshift([i, j]);
      r.emit(`Step back to [${i}][${j}]: ${step}.`, 5, i > 0 ? [i - 1] : [], {
        grid: grid([i, j], { path: [...path] }),
      });
    }
    const script = edits.filter(e => !e.startsWith('keep'));
    r.output = script;
    r.marked = a.map((_, k) => k);
    r.emit(
      `Distance ${distance}. ${script.length ? `Edit script: ${script.join(', ')}.` : 'The words are already equal.'}`,
      4,
      [],
      { grid: grid(null, { path }) }
    );
  },
  check(input, last, target) {
    const cells = last.grid?.cells;
    if (!cells) return false;
    return cells.at(-1).at(-1) === levenshtein(input, [...String(target ?? '')]);
  },
};
