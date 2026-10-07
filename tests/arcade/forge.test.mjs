import assert from 'node:assert/strict';
import { lessons } from '../../dist/algorithms.mjs';
import { makeGap, scramble, orderScore, fillScore, fillPuzzle } from '../../dist/arcade/forge.mjs';

// Small seeded generator so the test is repeatable.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allLines = lessons.flatMap(l => l.code);
assert.ok(allLines.length > 100, 'lessons loaded');

// makeGap: exactly four distinct options containing the answer, and the pieces rebuild the line.
let gapped = 0;
for (const [i, line] of allLines.entries()) {
  for (let seed = 0; seed < 3; seed++) {
    const gap = makeGap(line, mulberry32(i * 7 + seed));
    if (!gap) continue;
    gapped++;
    assert.equal(gap.options.length, 4, `four options for ${line}`);
    assert.equal(new Set(gap.options).size, 4, `distinct options for ${line}`);
    assert.ok(gap.options.includes(gap.answer), `answer offered for ${line}`);
    assert.equal(gap.before + gap.answer + gap.after, line, `pieces rebuild ${line}`);
    assert.ok(gap.answer.trim().length > 0, `non-empty answer for ${line}`);
    for (const option of gap.options) assert.ok(option.length > 0, `non-empty option for ${line}`);
  }
}
const linesWithGap = allLines.filter(line => makeGap(line, mulberry32(1)) !== null);
assert.ok(linesWithGap.length >= 20, `at least 20 lines have a gap (got ${linesWithGap.length})`);
assert.ok(gapped >= 20);

// Specific token classes.
const COMPARE = ['<', '<=', '>', '>=', '==', '!='];
const opGap = makeGap('x <= y', () => 0);
assert.equal(opGap.answer, '<=');
assert.ok(opGap.options.every(o => COMPARE.includes(o)));
const numberGap = makeGap('i = 0', () => 0.99);
assert.equal(numberGap.answer, '0');
assert.ok(numberGap.options.every(o => /^\d+$/.test(o)));
const indexGap = makeGap('swap(a[i + 1], b)', () => 0.6);
assert.equal(indexGap.answer, 'a[i + 1]');
assert.ok(indexGap.options.includes('a[i]'));
const wordGap = makeGap('value = queue.dequeue()', () => 0);
assert.ok(['queue', 'dequeue', 'value'].includes(wordGap.answer));
// A token that appears twice on the line is never blanked.
for (let seed = 0; seed < 20; seed++)
  assert.notEqual(makeGap('for end = n − 1 down to 1', mulberry32(seed))?.answer, '1');
assert.equal(makeGap('return'), null);
assert.equal(makeGap('loop'), null);

// Every lesson yields a fill puzzle.
for (const lesson of lessons) {
  const puzzle = fillPuzzle(lesson, mulberry32(3));
  assert.ok(puzzle, `fill puzzle for ${lesson.id}`);
  assert.equal(puzzle.lesson, lesson);
  assert.equal(lesson.code[puzzle.index], puzzle.line);
}

// scramble never returns the original order when the lines differ.
for (const lesson of lessons)
  for (let seed = 0; seed < 5; seed++) {
    const order = scramble(lesson.code, mulberry32(seed));
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      lesson.code.map((_, i) => i)
    );
    assert.ok(
      order.some((li, slot) => lesson.code[li] !== lesson.code[slot]),
      `${lesson.id} scrambled`
    );
  }
assert.deepEqual(scramble(['same', 'same'], mulberry32(1)).length, 2);
assert.deepEqual(scramble(['only'], mulberry32(1)), [0]);

// Scoring.
assert.equal(orderScore(0, 0), 150);
assert.equal(orderScore(0, 30), 125);
assert.equal(orderScore(0, 60), 100);
assert.equal(orderScore(0, 200), 100);
assert.equal(orderScore(2, 60), 70);
assert.equal(orderScore(10, 60), 0);
assert.equal(fillScore(1, 0), 80);
assert.equal(fillScore(1, 25), 60);
assert.equal(fillScore(2, 0), 50);
assert.equal(fillScore(3, 0), 0);

console.log(
  `forge: ${gapped} gaps checked across ${allLines.length} lines, ${linesWithGap.length} lines gappable.`
);
