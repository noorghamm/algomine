import assert from 'node:assert/strict';
import { simulate } from '../../dist/algorithms.mjs';

const sample = [8, 4, 12, 2, 6, 10, 14];
let checked = 0;

// In-order values of a flat node list rooted at id 0.
const inorder = nodes => {
  const out = [];
  const walk = id => {
    if (id === null) return;
    walk(nodes[id].left);
    out.push(nodes[id].value);
    walk(nodes[id].right);
  };
  if (nodes.length) walk(0);
  return out;
};

// Height of a flat node list rooted at id 0.
const heightOf = nodes => {
  const walk = id => (id === null ? 0 : 1 + Math.max(walk(nodes[id].left), walk(nodes[id].right)));
  return nodes.length ? walk(0) : 0;
};

// Traversal orders on the sample tree.
assert.deepEqual(simulate('preorder', sample).at(-1).output, [8, 4, 2, 6, 12, 10, 14]);
assert.deepEqual(simulate('postorder', sample).at(-1).output, [2, 6, 4, 10, 14, 12, 8]);
assert.deepEqual(simulate('preorder', [1, 2, 3]).at(-1).output, [1, 2, 3]);
assert.deepEqual(simulate('postorder', [1, 2, 3]).at(-1).output, [3, 2, 1]);
assert.deepEqual(simulate('postorder', [5, 5, 5]).at(-1).output, [5]);
checked += 5;

// Every tree frame keeps the root at id 0 and every node reachable from it.
for (const [id, input, target] of [
  ['preorder', sample],
  ['postorder', sample],
  ['bstInsert', sample, 5],
  ['bstDelete', sample, 4],
  ['bstDelete', sample, 8],
  ['avl', [10, 20, 30, 25, 28, 5]],
  ['avl', [1, 2, 3, 4, 5, 6, 7]],
])
  for (const f of simulate(id, input, target)) {
    f.nodes.forEach((n, i) => assert.equal(n.id, i, `${id}: node ids are indices`));
    assert.equal(inorder(f.nodes).length, f.nodes.length, `${id}: every node reachable from id 0`);
    for (const a of f.active) assert.ok(a < f.nodes.length, `${id}: active id ${a} in range`);
    checked++;
  }

// Insert: the sapling becomes a leaf, duplicates are ignored, inserting below a single node works.
{
  const last = simulate('bstInsert', sample, 5).at(-1);
  assert.deepEqual(inorder(last.nodes), [2, 4, 5, 6, 8, 10, 12, 14]);
  const fresh = last.nodes.at(-1);
  assert.equal(fresh.value, 5);
  assert.equal(fresh.left, null);
  assert.equal(fresh.right, null);
  assert.equal(last.nodes[4].left, fresh.id, '5 hangs under 6');
  const dup = simulate('bstInsert', sample, 6);
  assert.equal(dup.at(-1).nodes.length, 7);
  assert.ok(dup.at(-1).message.includes('Duplicates are ignored'));
  const single = simulate('bstInsert', [7, 7, 7], 3).at(-1);
  assert.deepEqual(inorder(single.nodes), [3, 7]);
  assert.equal(single.nodes[0].value, 7);
  checked += 3;
}

// Delete: the three cases, a missing target, and emptying the tree.
{
  const leaf = simulate('bstDelete', sample, 2).at(-1);
  assert.deepEqual(inorder(leaf.nodes), [4, 6, 8, 10, 12, 14]);
  assert.equal(leaf.nodes[0].value, 8);

  const oneChild = simulate('bstDelete', [8, 4, 12, 2, 1], 2).at(-1);
  assert.deepEqual(inorder(oneChild.nodes), [1, 4, 8, 12]);
  assert.equal(oneChild.nodes[0].value, 8);
  assert.equal(
    oneChild.nodes[oneChild.nodes[0].left].left,
    oneChild.nodes.findIndex(n => n.value === 1)
  );

  const two = simulate('bstDelete', sample, 4);
  const twoLast = two.at(-1);
  assert.deepEqual(inorder(twoLast.nodes), [2, 6, 8, 10, 12, 14]);
  assert.equal(twoLast.nodes[twoLast.nodes[0].left].value, 6, 'successor 6 replaces 4');
  const caseAsk = two.find(f => f.ask?.prompt.startsWith('Which case'));
  assert.equal(caseAsk.ask.answer, 2);
  const successorAsk = two.find(f => f.ask?.kind === 'node');
  assert.equal(successorAsk.nodes[successorAsk.ask.answer].value, 6);

  const rootTwo = simulate('bstDelete', sample, 8).at(-1);
  assert.deepEqual(inorder(rootTwo.nodes), [2, 4, 6, 10, 12, 14]);
  assert.equal(rootTwo.nodes[0].value, 10, 'successor 10 becomes the root');

  const missing = simulate('bstDelete', sample, 99);
  assert.deepEqual(inorder(missing.at(-1).nodes), [2, 4, 6, 8, 10, 12, 14]);
  assert.ok(missing.at(-1).message.includes('not in the tree'));

  const emptied = simulate('bstDelete', [5, 5, 5], 5).at(-1);
  assert.deepEqual(emptied.nodes, []);
  assert.deepEqual(emptied.values, []);
  checked += 6;
}

// AVL: rotation cases and the resulting shapes.
{
  const sorted = simulate('avl', [1, 2, 3, 4, 5, 6, 7]).at(-1);
  assert.equal(sorted.nodes[0].value, 4, 'sorted input ends with root 4');
  assert.equal(heightOf(sorted.nodes), 3, 'sorted input ends with height 3');
  assert.deepEqual(inorder(sorted.nodes), [1, 2, 3, 4, 5, 6, 7]);

  const rotationsOf = frames => frames.map(f => f.message.match(/^(LL|LR|RR|RL) case/)?.[1]).filter(Boolean);
  assert.deepEqual(rotationsOf(simulate('avl', [30, 20, 10])), ['LL']);
  assert.deepEqual(rotationsOf(simulate('avl', [10, 20, 30])), ['RR']);
  assert.deepEqual(rotationsOf(simulate('avl', [30, 10, 20])), ['LR']);
  assert.deepEqual(rotationsOf(simulate('avl', [10, 30, 20])), ['RL']);
  for (const input of [
    [30, 20, 10],
    [10, 20, 30],
    [30, 10, 20],
    [10, 30, 20],
  ]) {
    const last = simulate('avl', input).at(-1);
    assert.equal(last.nodes[0].value, 20, `${input}: root 20 after rotation`);
    assert.equal(heightOf(last.nodes), 2);
  }

  const sampleRun = simulate('avl', [10, 20, 30, 25, 28, 5]);
  assert.deepEqual(rotationsOf(sampleRun), ['RR', 'LR']);
  const outcomes = sampleRun
    .filter(f => f.ask?.options?.[0] === 'Balanced, no rotation')
    .map(f => f.ask.answer);
  assert.deepEqual(outcomes, [0, 1, 0, 2, 0], 'one prediction per insert after the root');
  assert.ok(sampleRun.some(f => f.sub && Object.values(f.sub).some(t => /^h=\d+ b=[+-]?\d+$/.test(t))));
  assert.equal(sampleRun.at(-1).nodes[0].value, 20);
  assert.equal(heightOf(sampleRun.at(-1).nodes), 3);

  const dup = simulate('avl', [5, 5, 5, 5]).at(-1);
  assert.deepEqual(inorder(dup.nodes), [5]);
  checked += 12;
}

console.log(`${checked} tree lesson checks passed.`);
