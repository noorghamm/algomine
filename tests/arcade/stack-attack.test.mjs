import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBalanced,
  makeBracketString,
  makeOps,
  applyOp,
  speedBonus,
  KINDS,
} from '../../dist/arcade/stack-attack.mjs';

const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

test('isBalanced on a dozen cases', () => {
  const cases = [
    ['', true],
    ['()', true],
    ['([]{})', true],
    ['{[()]}', true],
    ['(()())[]', true],
    ['a(b)c[d]', true],
    ['(', false],
    [')', false],
    ['(]', false],
    ['([)]', false],
    ['(()', false],
    ['())', false],
    ['{[}]', false],
    ['()[]{}}', false],
  ];
  for (const [s, expected] of cases) assert.equal(isBalanced(s), expected, JSON.stringify(s));
});

test('makeBracketString respects the requested verdict and length', () => {
  const rng = seeded(4);
  for (let i = 0; i < 60; i++) {
    const wanted = i % 2 === 0;
    const s = makeBracketString(rng, wanted);
    assert.ok(s.length >= 8 && s.length <= 12, `length ${s.length}`);
    assert.ok(/^[()[\]{}]+$/.test(s), s);
    assert.equal(isBalanced(s), wanted, s);
  }
});

// Independent reference: front is index 0, back is the end.
function reference(ops) {
  const list = [];
  const removed = [];
  for (const op of ops) {
    if (op.type === 'push' || op.type === 'enqueue' || op.type === 'pushBack') list.push(op.value);
    else if (op.type === 'pushFront') list.unshift(op.value);
    else if (op.type === 'pop' || op.type === 'popBack') removed.push(list.pop());
    else if (op.type === 'dequeue' || op.type === 'popFront') removed.push(list.shift());
    else throw new Error(`Unknown op ${op.type}`);
  }
  return removed;
}

test('makeOps never removes from an empty structure and removals match a reference', () => {
  const rng = seeded(8);
  for (const kind of KINDS) {
    for (let i = 0; i < 40; i++) {
      const { ops, removals } = makeOps(rng, kind);
      assert.ok(ops.length >= 8 && ops.length <= 12, `${ops.length} ops`);
      const removes = ops.filter(op => op.removes);
      assert.ok(removes.length >= 3 && removes.length <= 5, `${removes.length} removals`);
      let size = 0;
      for (const op of ops) {
        if (op.removes) {
          assert.ok(size >= 2, 'at least two values stored before a removal');
          size--;
        } else {
          assert.ok(Number.isInteger(op.value));
          size++;
        }
        assert.ok(typeof op.label === 'string' && op.label.length > 0);
      }
      assert.deepEqual(removals, reference(ops));
      for (const value of removals) assert.ok(Number.isInteger(value));
      const live = [];
      const seen = [];
      for (const op of ops) {
        const out = applyOp(live, op);
        if (op.removes) seen.push(out);
      }
      assert.deepEqual(seen, removals);
    }
  }
});

test('stack pops the last value and queue dequeues the first', () => {
  const rng = seeded(13);
  const stack = makeOps(rng, 'stack');
  const stackPush = stack.ops.filter(op => !op.removes).map(op => op.value);
  assert.equal(stack.removals[0], stackPush[stack.ops.findIndex(op => op.removes) - 1]);
  const queue = makeOps(rng, 'queue');
  const queuePush = queue.ops.filter(op => !op.removes).map(op => op.value);
  assert.equal(queue.removals[0], queuePush[0]);
});

test('speed bonus runs from 20 down to 0 across six seconds', () => {
  assert.equal(speedBonus(0), 20);
  assert.equal(speedBonus(3), 10);
  assert.equal(speedBonus(6), 0);
  assert.equal(speedBonus(9), 0);
});
