import assert from 'node:assert/strict';
import { lessons, definitions, simulate, topics } from '../dist/algorithms.mjs';
import { courses } from '../dist/courses.mjs';

// Generated inputs per input kind.
const numberInputs = [
  [7, 3, 9, 4, 6, 2, 8, 5],
  [1, 2, 3],
  [3, 2, 1],
  [5, 5, 5, 5],
  [20, 1, 20, 2, 2, 1],
  [8, 4, 12, 2, 6, 10, 14],
  [10, 3, 17, 8, 12],
];
const textInputs = ['abracadabra', 'kitten', 'aab', '{[()]}', 'ababcabab', 'z'];
const targets = [6, 8, 99, 1];

let checked = 0;
for (const lesson of lessons) {
  assert.equal(typeof lesson.id, 'string');
  assert.ok(Array.isArray(lesson.code) && lesson.code.length > 0, `${lesson.id}: pseudocode`);
  assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length >= 1, `${lesson.id}: quiz`);
  for (const q of lesson.quiz) {
    assert.ok(q.question && Array.isArray(q.answers) && q.answers.length >= 2, `${lesson.id}: quiz shape`);
    assert.ok(
      Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.answers.length,
      `${lesson.id}: quiz index`
    );
    assert.ok(q.reason, `${lesson.id}: quiz reason`);
  }
  assert.ok(
    topics.some(t => t.algorithms.includes(lesson.id)),
    `${lesson.id}: listed in a topic`
  );
  for (const text of [lesson.intro, lesson.insight, ...lesson.quiz.map(q => q.reason)])
    assert.ok(!text.includes('—'), `${lesson.id}: no em dashes in copy`);

  const kind = lesson.inputKind || 'numbers';
  const inputs =
    kind === 'fixed'
      ? [lesson.sample?.input ?? [1, 2, 3, 4, 5, 6, 7]]
      : kind === 'text'
        ? [lesson.sample?.input, ...textInputs].filter(Boolean)
        : [lesson.sample?.input, ...numberInputs].filter(Boolean);
  const targetList = lesson.target
    ? kind === 'text'
      ? [lesson.sample?.target ?? 'ab', 'a', 'zz']
      : targets
    : [undefined];

  for (const input of inputs)
    for (const target of targetList) {
      const original = JSON.stringify(input);
      const frames = simulate(lesson.id, input, target);
      assert.equal(JSON.stringify(input), original, `${lesson.id}: must not mutate input`);
      assert.ok(frames.length >= 2, `${lesson.id}: frames`);
      assert.equal(frames.at(-1).complete, true, `${lesson.id}: last frame complete`);
      for (const f of frames) {
        assert.ok(
          Number.isInteger(f.line) && f.line >= 0 && f.line < lesson.code.length,
          `${lesson.id}: line ${f.line}`
        );
        assert.ok(typeof f.message === 'string' && f.message.length > 0, `${lesson.id}: message`);
        assert.ok(
          f.active.every(i => Number.isInteger(i) && i >= 0),
          `${lesson.id}: active indices`
        );
        if (f.ask) {
          assert.ok(['bool', 'index', 'node', 'choice'].includes(f.ask.kind), `${lesson.id}: ask kind`);
          assert.ok(f.ask.prompt, `${lesson.id}: ask prompt`);
          if (f.ask.kind === 'choice') {
            assert.ok(Array.isArray(f.ask.options) && f.ask.options.length >= 2, `${lesson.id}: ask options`);
            assert.ok(f.ask.answer >= 0 && f.ask.answer < f.ask.options.length, `${lesson.id}: ask answer`);
          }
          if (f.ask.kind === 'bool') assert.equal(typeof f.ask.answer, 'boolean', `${lesson.id}: bool ask`);
          if (['index', 'node'].includes(f.ask.kind))
            assert.ok(Number.isInteger(f.ask.answer), `${lesson.id}: index ask`);
        }
      }
      const inputValue = kind === 'text' ? [...input] : input;
      assert.ok(
        lesson.check(inputValue, frames.at(-1), target),
        `${lesson.id}: check failed for ${original} / ${target}`
      );
      checked++;
    }
  assert.ok(
    simulate(lesson.id, inputs[0], targetList[0]).some(f => f.ask),
    `${lesson.id}: at least one ask`
  );
}

for (const topic of topics)
  for (const id of topic.algorithms) assert.ok(definitions[id], `${topic.id}: lesson ${id} exists`);
for (const course of courses)
  for (const chapter of course.chapters)
    for (const id of chapter.lessons) assert.ok(definitions[id], `course lesson ${id} exists`);

console.log(`${checked} lesson runs passed across ${lessons.length} lessons.`);
