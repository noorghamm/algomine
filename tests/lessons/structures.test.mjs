import assert from 'node:assert/strict';
import { simulate } from '../../dist/algorithms.mjs';

// Independent reference for the bracket lesson.
const PAIR = { '(': ')', '[': ']', '{': '}' };
function balancedRef(text) {
  const stack = [];
  for (const ch of text) {
    if (ch in PAIR) stack.push(ch);
    else if (Object.values(PAIR).includes(ch)) {
      if (!stack.length || PAIR[stack.pop()] !== ch) return false;
    }
  }
  return stack.length === 0;
}

let checked = 0;
const asksOf = frames => frames.filter(f => f.ask);

// listInsert: 0-based position, value 5, append past the end.
{
  const sample = [4, 8, 3, 7, 2];
  const frames = simulate('listInsert', sample, 2);
  const last = frames.at(-1);
  assert.deepEqual(last.values, [4, 8, 5, 3, 7, 2]);
  assert.equal(last.moves, 1);
  assert.ok(
    frames.some(f => f.incoming === 5),
    'incoming badge shown'
  );
  assert.ok(
    frames.some(f => Array.isArray(f.activeEdge)),
    'activeEdge shown while walking'
  );
  assert.ok(asksOf(frames).length >= 2, 'at least two asks');
  assert.ok(
    asksOf(frames).some(f => f.ask.kind === 'index') && asksOf(frames).some(f => f.ask.kind === 'bool')
  );
  assert.deepEqual(
    simulate('listInsert', sample, 99).at(-1).values,
    [4, 8, 3, 7, 2, 5],
    'past the end appends'
  );
  assert.deepEqual(
    simulate('listInsert', sample, 5).at(-1).values,
    [4, 8, 3, 7, 2, 5],
    'position = length appends'
  );
  assert.deepEqual(
    simulate('listInsert', sample, 0).at(-1).values,
    [5, 4, 8, 3, 7, 2],
    'position 0 is the head'
  );
  assert.deepEqual(simulate('listInsert', sample, 1).at(-1).values, [4, 5, 8, 3, 7, 2]);
  assert.deepEqual(simulate('listInsert', [1, 2, 3], 1).at(-1).values, [1, 5, 2, 3]);
  checked += 6;
}

// listDelete: remove the first match, keep the rest in order, report a missing target.
{
  const sample = [4, 8, 3, 7, 2];
  const frames = simulate('listDelete', sample, 3);
  assert.deepEqual(frames.at(-1).values, [4, 8, 7, 2]);
  assert.equal(frames.at(-1).moves, 1);
  assert.equal(frames.at(-1).comparisons, 3);
  assert.ok(asksOf(frames).length >= 2, 'at least two asks');
  assert.deepEqual(simulate('listDelete', sample, 4).at(-1).values, [8, 3, 7, 2], 'delete the head');
  assert.deepEqual(simulate('listDelete', sample, 2).at(-1).values, [4, 8, 3, 7], 'delete the tail');
  const missing = simulate('listDelete', sample, 99);
  assert.deepEqual(missing.at(-1).values, sample, 'missing target leaves the list alone');
  assert.equal(missing.at(-1).moves, 0);
  assert.match(missing.at(-1).message, /Not found/);
  assert.deepEqual(
    simulate('listDelete', [20, 1, 20, 2, 2, 1], 20).at(-1).values,
    [1, 20, 2, 2, 1],
    'first match only'
  );
  checked += 5;
}

// brackets: verdict matches the reference, frames carry the text row and the stack tray.
{
  const cases = ['{[()]}', '([)]', '((', ')', 'kitten', 'a(b)c', '{[()]}}', '', 'z', '[{()}]()', '(]', '{[}'];
  for (const text of cases) {
    const frames = simulate('brackets', text);
    const last = frames.at(-1);
    assert.equal(
      last.message.startsWith('Balanced'),
      balancedRef(text),
      `verdict for ${JSON.stringify(text)}`
    );
    assert.equal(/^Not balanced/.test(last.message), !balancedRef(text));
    for (const f of frames.slice(1)) {
      assert.ok(f.text && f.text.rows.length === 1, 'text row');
      assert.deepEqual(f.text.rows[0].chars, [...text]);
      assert.ok(Array.isArray(f.trays) && f.trays[0].label === 'STACK', 'stack tray');
    }
    checked++;
  }
  const sample = simulate('brackets', '{[()]}');
  assert.equal(asksOf(sample).length, 6, 'one choice ask per bracket');
  assert.ok(asksOf(sample).every(f => f.ask.kind === 'choice' && f.ask.options.length === 3));
  const stacks = sample.map(f => f.trays?.[0].values.join(''));
  assert.ok(stacks.includes('{[('), 'stack grows to three openers');
  assert.deepEqual(sample.at(-1).trays[0].values, []);
  assert.deepEqual(
    sample.at(-1).marked.sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5]
  );
  const skipped = simulate('brackets', 'a(b)c');
  assert.deepEqual(skipped.at(-1).discarded, [0, 2, 4], 'non-brackets are discarded');
  const unmatched = simulate('brackets', '(]');
  assert.match(unmatched.at(-1).message, /is closed by/);
  assert.match(simulate('brackets', ')').at(-1).message, /no opener/);
  assert.match(simulate('brackets', '((').at(-1).message, /2 openers left/);
  checked += 4;
}

// chaining: 7 slots, value mod 7, duplicates skipped, stats reported.
{
  const sample = [10, 3, 17, 8, 12, 24];
  const frames = simulate('chaining', sample);
  const last = frames.at(-1);
  assert.deepEqual(last.values, [[], [8], [], [10, 3, 17, 24], [], [12], []]);
  assert.equal(last.values.length, 7);
  assert.equal(last.moves, 6);
  assert.equal(last.comparisons, 1 + 2 + 3, 'one comparison per chain element walked');
  assert.match(last.message, /Longest chain: 4 blocks in chest 3/);
  assert.match(last.message, /Load factor: 6 \/ 7/);
  assert.equal(asksOf(frames).length, 6);
  assert.ok(asksOf(frames).every(f => f.ask.kind === 'index'));
  assert.deepEqual(
    asksOf(frames).map(f => f.ask.answer),
    sample.map(v => v % 7)
  );
  assert.ok(frames.some(f => f.incoming === 24));
  const dup = simulate('chaining', [5, 5, 5, 5]);
  assert.deepEqual(dup.at(-1).values[5], [5]);
  assert.equal(dup.at(-1).moves, 1);
  assert.equal(dup.at(-1).comparisons, 3);
  assert.ok(dup.some(f => /already in chest 5, skip/.test(f.message)));
  assert.match(dup.at(-1).message, /Load factor: 1 \/ 7/);
  const mixed = simulate('chaining', [20, 1, 20, 2, 2, 1]).at(-1);
  assert.deepEqual(mixed.values, [[], [1], [2], [], [], [], [20]]);
  // Nested arrays are copied per frame: earlier frames must not see later pushes.
  assert.deepEqual(frames[1].values, [[], [], [], [], [], [], []]);
  checked += 4;
}

console.log(`${checked} structure lesson checks passed.`);
