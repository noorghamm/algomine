import assert from 'node:assert/strict';
import {
  insertParent,
  treeHeight,
  explainInsert,
  pickValues,
  heightOptions,
} from '../../dist/arcade/bst-builder.mjs';
import { makeTree } from '../../dist/algorithms.mjs';

const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// insertParent agrees with makeTree on random distinct value lists.
let checked = 0;
for (let seed = 1; seed <= 80; seed++) {
  const rng = mulberry(seed);
  const size = 1 + Math.floor(rng() * 12);
  const drawn = pickValues(rng, size + 1, 30);
  const values = drawn.slice(0, size);
  const value = drawn[size];
  const { parentIndex, side } = insertParent(values, value);
  const before = makeTree(values);
  const after = makeTree([...values, value]);
  const newId = after.length - 1;
  assert.equal(after.length, before.length + 1, 'a distinct value adds one node');
  assert.equal(after[newId].value, value);
  assert.equal(after[parentIndex][side], newId, `parent ${parentIndex} points ${side} at the new node`);
  assert.equal(before[parentIndex][side], null, 'that slot was empty before the insert');
  const other = side === 'left' ? 'right' : 'left';
  assert.equal(after[parentIndex][other], before[parentIndex][other], 'the other side is untouched');
  checked++;
}

assert.deepEqual(insertParent([], 5), { parentIndex: null, side: null });
assert.deepEqual(insertParent([8], 3), { parentIndex: 0, side: 'left' });
assert.deepEqual(insertParent([8], 12), { parentIndex: 0, side: 'right' });
assert.deepEqual(insertParent([8, 4, 12], 6), { parentIndex: 1, side: 'right' });
assert.deepEqual(insertParent([8, 4, 12], 4), { parentIndex: 1, side: null }, 'duplicates have no slot');

// treeHeight counts levels: a lone root is 1.
assert.equal(treeHeight([]), 0);
assert.equal(treeHeight(makeTree([8])), 1);
assert.equal(treeHeight(makeTree([8, 4, 12])), 2);
assert.equal(treeHeight(makeTree([8, 4, 12, 2, 6, 10, 14])), 3);
assert.equal(treeHeight(makeTree([8, 4, 12, 2])), 3);
assert.equal(treeHeight(makeTree([1, 2, 3, 4, 5])), 5, 'a sorted insert makes a chain');
assert.equal(treeHeight(makeTree([5, 3, 8, 1, 4, 7, 9, 2])), 4);

// Explanations name the comparisons on the way down.
{
  const text = explainInsert([8, 4, 12], 6);
  assert.match(text, /6 is smaller than 8, so go left/);
  assert.match(text, /6 is larger than 4, so go right/);
  assert.match(text, /right slot under 4 is empty/);
  assert.match(explainInsert([], 9), /root/);
  assert.match(explainInsert([8, 4], 4), /already/);
}

// Height options: four distinct answers including the real one, nothing below 1.
for (let seed = 1; seed <= 20; seed++) {
  for (const height of [1, 2, 3, 4, 7]) {
    const options = heightOptions(height, mulberry(seed));
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(height));
    assert.ok(options.every(h => h >= 1));
    assert.deepEqual(
      options,
      [...options].sort((a, b) => a - b)
    );
  }
}

// pickValues gives distinct values in range.
{
  const values = pickValues(mulberry(3));
  assert.equal(values.length, 7);
  assert.equal(new Set(values).size, 7);
  assert.ok(values.every(v => v >= 1 && v <= 30));
}

console.log(`bst-builder: ${checked} random inserts checked.`);
