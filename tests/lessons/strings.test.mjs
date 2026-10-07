import assert from 'node:assert/strict';
import { simulate, definitions } from '../../dist/algorithms.mjs';

// Rune Library and Compression Forge: naive matching, KMP, edit distance, Huffman coding.
let checked = 0;

// Every offset where `pattern` occurs in `text`, overlapping matches included.
const occurrences = (text, pattern) => {
  const out = [];
  if (!pattern.length) return out;
  for (let s = 0; s + pattern.length <= text.length; s++)
    if (text.slice(s, s + pattern.length) === pattern) out.push(s);
  return out;
};

const matchCases = [
  ['ababcabab', 'abab', [0, 5]],
  ['aaaa', 'aa', [0, 1, 2]],
  ['abracadabra', 'abra', [0, 7]],
  ['abracadabra', 'a', [0, 3, 5, 7, 10]],
  ['abracadabra', 'zz', []],
  ['z', 'zz', []],
  ['kitten', 'ten', [3]],
  ['{[()]}', '()', [2]],
];
for (const name of ['naive', 'kmp'])
  for (const [text, pattern, expected] of matchCases) {
    const frames = simulate(name, text, pattern);
    const last = frames.at(-1);
    assert.deepEqual(last.output, expected, `${name}: offsets for ${text} / ${pattern}`);
    assert.deepEqual(last.output, occurrences(text, pattern), `${name}: offsets agree with a scan`);
    assert.ok(last.complete, `${name}: complete`);
    // The text view shows two rows: the text and the shifted pattern.
    for (const f of frames.slice(1)) {
      assert.ok(Array.isArray(f.text?.rows) && f.text.rows.length >= 1, `${name}: text rows`);
      for (const row of f.text.rows) {
        assert.ok(Array.isArray(row.chars), `${name}: row chars`);
        assert.ok(!row.offset || row.offset >= 0, `${name}: non-negative offset`);
        for (const key of ['active', 'marked', 'discarded'])
          for (const i of row[key] || [])
            assert.ok(
              Number.isInteger(i) && i >= 0 && i < row.chars.length,
              `${name}: ${key} inside the row`
            );
      }
    }
    checked++;
  }

// Brute force asks whether runes match and what the shift is after a mismatch.
{
  const frames = simulate('naive', 'ababcabab', 'abab');
  const asks = frames.filter(f => f.ask).map(f => f.ask);
  assert.ok(
    asks.some(a => a.kind === 'bool'),
    'naive: bool asks'
  );
  const shifts = asks.filter(a => a.kind === 'choice');
  assert.ok(shifts.length >= 2, 'naive: shift asks');
  for (const a of shifts)
    assert.equal(a.options[a.answer], 'Shift by one', 'naive: brute force always shifts by one');
  assert.equal(frames.at(-1).comparisons, 14, 'naive: comparisons on the sample');
  checked++;
}

// KMP builds the border table first, shows it in a tray, and compares less than brute force.
{
  const frames = simulate('kmp', 'ababcabab', 'abab');
  const trays = frames.map(f => f.trays?.find(t => t.label === 'BORDER')).filter(Boolean);
  assert.ok(trays.length > 0, 'kmp: border tray');
  assert.deepEqual(trays.at(-1).values, [0, 0, 1, 2], 'kmp: border table of abab');
  const naive = simulate('naive', 'ababcabab', 'abab').at(-1).comparisons;
  assert.ok(
    frames.at(-1).comparisons < naive,
    `kmp: ${frames.at(-1).comparisons} comparisons < naive ${naive}`
  );
  const shifts = frames.filter(f => f.ask?.kind === 'choice').map(f => f.ask);
  assert.ok(shifts.length >= 1, 'kmp: shift asks');
  for (const a of shifts) assert.ok(/^Shift by \d+$/.test(a.options[a.answer]), 'kmp: shift option');
  assert.ok(
    frames.some(f => f.ask?.kind === 'bool'),
    'kmp: bool asks'
  );
  // The text index never moves backwards during the scan.
  let lastIndex = -1;
  for (const f of frames) {
    const m = f.message.match(/^Compare text\[(\d+)\]/);
    if (!m) continue;
    assert.ok(Number(m[1]) >= lastIndex, 'kmp: text index never goes back');
    lastIndex = Number(m[1]);
  }
  checked++;
}

// Edit distance fills the table and reports a correct distance with a path back to the corner.
const levenshtein = (a, b) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
};
const distanceCases = [
  ['kitten', 'sitting', 3],
  ['abracadabra', 'abab', 7],
  ['aab', 'a', 2],
  ['z', 'zz', 1],
  ['flaw', 'lawn', 2],
  ['same', 'same', 0],
  ['', 'abc', 3],
];
for (const [a, b, expected] of distanceCases) {
  const frames = simulate('editDistance', a, b);
  const last = frames.at(-1);
  const cells = last.grid.cells;
  assert.equal(cells.length, a.length + 1, 'editDistance: rows');
  assert.equal(cells[0].length, b.length + 1, 'editDistance: columns');
  assert.equal(cells.at(-1).at(-1), expected, `editDistance: ${a} to ${b}`);
  assert.equal(cells.at(-1).at(-1), levenshtein(a, b), 'editDistance: matches an independent computation');
  assert.ok(
    cells.every(row => row.every(v => Number.isInteger(v))),
    'editDistance: every cell filled'
  );
  assert.deepEqual(last.grid.rowLabels, ['ε', ...a], 'editDistance: row labels');
  assert.deepEqual(last.grid.colLabels, ['ε', ...b], 'editDistance: column labels');
  assert.deepEqual(last.grid.path[0], [0, 0], 'editDistance: path starts at the corner');
  assert.deepEqual(last.grid.path.at(-1), [a.length, b.length], 'editDistance: path ends at the answer');
  assert.equal(last.output.length, expected, 'editDistance: one edit per unit of distance');
  assert.equal(last.comparisons, a.length * b.length, 'editDistance: one comparison per inner cell');
  for (const f of frames)
    if (f.grid?.active)
      assert.ok(
        f.grid.active[0] < cells.length && f.grid.active[1] < cells[0].length,
        'editDistance: active in grid'
      );
  checked++;
}
{
  const frames = simulate('editDistance', 'kitten', 'sitting');
  const asks = frames.filter(f => f.ask).map(f => f.ask);
  assert.ok(
    asks.length >= 2 && asks.every(a => a.kind === 'choice' && a.options.length === 3),
    'editDistance: asks'
  );
  assert.ok(frames.at(-1).message.includes('Distance 3'), 'editDistance: final message');
  assert.ok(frames.at(-1).message.includes('insert "g"'), 'editDistance: edit script');
  checked++;
}

// Huffman codes are prefix-free, optimal, and the forest frames point at valid nodes.
const optimalBits = chars => {
  const counts = new Map();
  for (const ch of chars) counts.set(ch, (counts.get(ch) || 0) + 1);
  const queue = [...counts.values()];
  if (queue.length === 1) return queue[0];
  let bits = 0;
  while (queue.length > 1) {
    queue.sort((x, y) => x - y);
    const merged = queue.shift() + queue.shift();
    bits += merged;
    queue.push(merged);
  }
  return bits;
};
for (const text of ['abracadabra', 'kitten', 'aab', '{[()]}', 'ababcabab', 'z', 'zzzz', 'mississippi']) {
  const frames = simulate('huffman', text);
  const last = frames.at(-1);
  const codes = new Map(last.output.map(entry => entry.split('=')));
  const distinct = new Set(text);
  assert.equal(codes.size, distinct.size, `huffman: one code per rune in ${text}`);
  for (const ch of distinct) assert.ok(/^[01]+$/.test(codes.get(ch)), `huffman: code for ${ch}`);
  for (const [x, cx] of codes)
    for (const [y, cy] of codes)
      if (x !== y) assert.ok(!cy.startsWith(cx), `huffman: ${cx} is a prefix of ${cy}`);
  const bits = [...text].reduce((sum, ch) => sum + codes.get(ch).length, 0);
  assert.equal(bits, optimalBits(text), `huffman: optimal length for ${text}`);
  assert.ok(last.message.includes(`${bits} bits`), 'huffman: final message reports the total');
  for (const f of frames) {
    for (const id of f.roots || [])
      assert.ok(Number.isInteger(id) && f.nodes[id], 'huffman: root ids are nodes');
    for (const id of Object.keys(f.sub || {})) assert.ok(f.nodes[Number(id)], 'huffman: sub keys are nodes');
    for (const n of f.nodes)
      for (const child of [n.left, n.right])
        assert.ok(child === null || f.nodes[child], 'huffman: child ids are nodes');
  }
  assert.deepEqual(last.roots, [last.nodes.length - 1], 'huffman: a single root at the end');
  assert.equal(last.nodes.length, 2 * distinct.size - 1, 'huffman: leaves plus internal nodes');
  checked++;
}
{
  assert.deepEqual(simulate('huffman', 'z').at(-1).output, ['z=0'], 'huffman: a lone rune gets the code 0');
  const empty = simulate('huffman', '');
  assert.ok(empty.at(-1).complete && empty.at(-1).output.length === 0, 'huffman: empty input does not throw');
  const frames = simulate('huffman', 'abracadabra');
  const asks = frames.filter(f => f.ask).map(f => f.ask);
  assert.ok(asks.length >= 2 && asks.every(a => a.kind === 'choice'), 'huffman: merge asks');
  assert.ok(frames.at(-1).message.includes('23 bits instead of 88'), 'huffman: abracadabra takes 23 bits');
  const tray = frames[1].trays.find(t => t.label === 'FREQUENCIES');
  assert.deepEqual(tray.values, ['c:1', 'd:1', 'b:2', 'r:2', 'a:5'], 'huffman: frequencies lightest first');
  checked++;
}

// Copy stays free of em dashes, including pseudocode, messages and asks.
for (const id of ['naive', 'kmp', 'editDistance', 'huffman']) {
  const lesson = definitions[id];
  const copy = [
    lesson.intro,
    lesson.insight,
    ...lesson.code,
    ...lesson.quiz.flatMap(q => [q.question, ...q.answers, q.reason]),
  ];
  for (const text of copy) assert.ok(!text.includes('\u2014'), `${id}: no em dashes`);
  const sample = lesson.sample;
  for (const f of simulate(id, sample.input, sample.target)) {
    assert.ok(!f.message.includes('\u2014'), `${id}: no em dashes in messages`);
    if (f.ask) assert.ok(!f.ask.prompt.includes('\u2014'), `${id}: no em dashes in asks`);
  }
  assert.equal(lesson.quiz.length, 3, `${id}: three quiz questions`);
  checked++;
}

console.log(`${checked} string and compression checks passed.`);
