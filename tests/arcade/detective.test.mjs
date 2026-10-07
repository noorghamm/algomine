import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRound, sortingLessons, guessScore, CANDIDATES } from '../../dist/arcade/detective.mjs';

// Deterministic rng so the tests are repeatable.
const seeded =
  (seed = 7) =>
  () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

const sorted = list => [...list].sort((a, b) => a - b);

test('sorting lessons exist in the registry', () => {
  const ids = sortingLessons();
  assert.ok(ids.length >= 3);
  for (const id of ids) assert.ok(CANDIDATES.includes(id));
});

test('makeRound frames start with the input and end sorted', () => {
  const rng = seeded(3);
  for (let i = 0; i < 40; i++) {
    const { lessonId, values, frames } = makeRound(rng);
    assert.ok(sortingLessons().includes(lessonId));
    assert.equal(values.length, 7);
    assert.equal(new Set(values).size, 7, 'values are distinct');
    for (const v of values) assert.ok(v >= 1 && v <= 12);
    assert.ok(frames.length > 1);
    assert.deepEqual(frames[0].values, values);
    assert.deepEqual(frames.at(-1).values, sorted(values));
    assert.equal(frames.at(-1).complete, true);
  }
});

test('makeRound honours the lesson list it is given', () => {
  const rng = seeded(11);
  for (let i = 0; i < 10; i++) assert.equal(makeRound(rng, ['bubble']).lessonId, 'bubble');
});

test('guessScore drops 2 per frame and never goes below 40', () => {
  assert.equal(guessScore(1), 198);
  assert.equal(guessScore(50), 100);
  assert.equal(guessScore(80), 40);
  assert.equal(guessScore(500), 40);
});
