import assert from 'node:assert/strict';
import { simulate } from '../../dist/algorithms.mjs';
import {
  makeDistractors,
  pickFrameIndex,
  makeCountOptions,
  makeQuestion,
  questionScore,
  traceLessons,
  randomInput,
  QUESTIONS,
} from '../../dist/arcade/trace.mjs';

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const key = v => JSON.stringify(v);

// The lesson pool only holds numeric worlds.
const pool = traceLessons();
assert.ok(pool.length >= 10, 'lesson pool');
for (const lesson of pool) assert.ok(!lesson.inputKind || lesson.inputKind === 'numbers', lesson.id);
assert.ok(!pool.some(l => ['brackets', 'hash', 'chaining', 'bfs', 'naive'].includes(l.id)));

// makeDistractors: three arrays, all different from the truth and from each other.
const inputs = [
  [5, 3, 8, 1, 9, 4],
  [1, 2, 3, 4, 5],
  [7, 7, 7, 7, 7],
  [20, 1, 20, 2, 2, 1],
];
for (const input of inputs)
  for (const lesson of pool) {
    const frames = simulate(lesson.id, input, 8);
    for (let seed = 0; seed < 4; seed++) {
      const rng = mulberry32(seed + input.length);
      const k = pickFrameIndex(frames, rng);
      assert.ok(k >= 0 && k < frames.length, `${lesson.id}: index in bounds`);
      if (frames.length >= 4)
        assert.ok(k >= 2 && k <= frames.length - 2, `${lesson.id}: index in [2, n - 2]`);
      const truth = frames[k].values;
      const distractors = makeDistractors(truth, frames, rng);
      assert.equal(distractors.length, 3, `${lesson.id}: three distractors`);
      const keys = new Set(distractors.map(key));
      assert.equal(keys.size, 3, `${lesson.id}: distractors differ from each other`);
      assert.ok(!keys.has(key(truth)), `${lesson.id}: distractors differ from the truth`);
      assert.deepEqual(frames[k].values, truth, 'truth untouched');
    }
  }
// Degenerate inputs still produce three distinct distractors.
assert.equal(new Set(makeDistractors([], [{ values: [] }], mulberry32(1)).map(key)).size, 3);
assert.equal(new Set(makeDistractors([4], [{ values: [4] }], mulberry32(1)).map(key)).size, 3);

// pickFrameIndex on tiny runs.
assert.equal(pickFrameIndex([], mulberry32(1)), 0);
assert.equal(pickFrameIndex([{}], mulberry32(1)), 0);
assert.equal(pickFrameIndex([{}, {}], mulberry32(1)), 1);
assert.equal(pickFrameIndex([{}, {}, {}, {}], mulberry32(1)), 2);
for (let seed = 0; seed < 50; seed++) {
  const frames = Array(5).fill({});
  const k = pickFrameIndex(frames, mulberry32(seed));
  assert.ok(k === 2 || k === 3);
}

// Count options: four distinct non-negative numbers including the truth.
for (const truth of [0, 1, 2, 7, 15]) {
  const options = makeCountOptions(truth, mulberry32(truth));
  assert.equal(options.length, 4);
  assert.equal(new Set(options).size, 4);
  assert.ok(options.includes(truth));
  assert.ok(options.every(o => Number.isInteger(o) && o >= 0));
}

// Full questions of both kinds.
for (let seed = 0; seed < 30; seed++) {
  const rng = mulberry32(100 + seed);
  for (const kind of ['values', 'count']) {
    const q = makeQuestion(kind, rng);
    assert.ok(q, `${kind} question built`);
    assert.equal(q.kind, kind);
    assert.equal(q.options.length, 4);
    assert.ok(q.answer >= 0 && q.answer < 4);
    assert.ok(q.k >= 2 && q.k <= q.frames.length - 2);
    assert.ok(q.input.length === 5 || q.input.length === 6);
    assert.ok(q.input.every(v => v >= 1 && v <= 20));
    if (kind === 'values') {
      assert.deepEqual(q.options[q.answer], q.frames[q.k].values);
      assert.equal(new Set(q.options.map(key)).size, 4);
    } else {
      assert.equal(q.options[q.answer], q.frames[q.k].comparisons);
      assert.equal(new Set(q.options).size, 4);
    }
  }
}
assert.ok(randomInput(mulberry32(5)).every(v => v >= 1 && v <= 20));

// Scoring: first try, second try, speed, hints off, streak multiplier.
assert.equal(questionScore({ attempts: 1, fraction: 1, hints: true, streak: 0 }), 150);
assert.equal(questionScore({ attempts: 1, fraction: 0, hints: true, streak: 0 }), 100);
assert.equal(questionScore({ attempts: 2, fraction: 0.5, hints: true, streak: 0 }), 65);
assert.equal(questionScore({ attempts: 3, fraction: 1, hints: true, streak: 0 }), 0);
assert.equal(questionScore({ attempts: 1, fraction: 0, hints: false, streak: 0 }), 200);
assert.equal(questionScore({ attempts: 1, fraction: 0, hints: true, streak: 3 }), 150);
assert.equal(questionScore({ attempts: 1, fraction: 0, hints: false, streak: 5 }), 300);
assert.equal(QUESTIONS, 8);

console.log(`trace: ${pool.length} lessons in the pool, questions and distractors verified.`);
