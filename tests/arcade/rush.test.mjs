import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeQuestion, pointsFor, KINDS, POOL } from '../../dist/arcade/rush.mjs';
import { lessons } from '../../dist/algorithms.mjs';

const seeded =
  (seed = 5) =>
  () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

const byId = Object.fromEntries(lessons.map(l => [l.id, l]));

test('makeQuestion always has four distinct options including the right answer', () => {
  const rng = seeded(21);
  const kinds = new Set();
  for (let i = 0; i < 300; i++) {
    const q = makeQuestion(rng, lessons);
    kinds.add(q.kind);
    assert.ok(KINDS.includes(q.kind));
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4, `options are distinct: ${q.options.join(' | ')}`);
    assert.ok(q.answer >= 0 && q.answer < 4);
    const lesson = byId[q.lessonId];
    assert.ok(lesson);
    const expected = q.kind === 'which' ? lesson.name : lesson[q.kind];
    assert.equal(q.options[q.answer], expected);
    assert.ok(q.prompt.length > 0);
    if (q.kind === 'which') assert.equal(q.detail, lesson.intro);
    else assert.ok(q.prompt.includes(lesson.name));
  }
  assert.equal(kinds.size, 3, 'all three question types appear');
});

test('makeQuestion fills from the pool when few distinct distractors exist', () => {
  const few = [
    { id: 'a', name: 'A', time: 'O(n)', space: 'O(1)', intro: 'A does things.' },
    { id: 'b', name: 'B', time: 'O(n)', space: 'O(1)', intro: 'B does other things.' },
  ];
  const rng = seeded(2);
  for (let i = 0; i < 20; i++) {
    const q = makeQuestion(rng, few, 'time');
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.answer], 'O(n)');
    for (const option of q.options) assert.ok(option === 'O(n)' || POOL.includes(option));
  }
});

test('equivalent complexity strings never appear together', () => {
  const pair = [
    { id: 'merge', name: 'Merge', time: 'Θ(n log n)', space: 'O(n)', intro: 'Split and merge.' },
    { id: 'heap', name: 'Heap', time: 'O(n log n)', space: 'O(1)', intro: 'Heapify and swap.' },
    { id: 'bubble', name: 'Bubble', time: 'O(n²)', space: 'O(1)', intro: 'Swap neighbours.' },
  ];
  const rng = seeded(9);
  for (let i = 0; i < 20; i++) {
    const q = makeQuestion(rng, pair, 'time');
    const normalised = q.options.map(o => o.toLowerCase().replace(/\s+/g, '').replace(/θ/g, 'o'));
    assert.equal(new Set(normalised).size, 4);
  }
});

test('streak bonus grows by 10 and caps at 50', () => {
  assert.equal(pointsFor(1), 50);
  assert.equal(pointsFor(2), 60);
  assert.equal(pointsFor(6), 100);
  assert.equal(pointsFor(20), 100);
});
