import assert from 'node:assert/strict';
import { simulate } from '../../dist/algorithms.mjs';

const map = [1, 2, 3, 4, 5, 6, 7];
const sortedAsc = v => [...v].sort((x, y) => x - y);
const isMaxHeap = h => h.every((v, i) => i === 0 || h[Math.floor((i - 1) / 2)] >= v);
const states = new Set(['idle', 'active', 'tree', 'rejected']);
let checked = 0;

// Dijkstra: exact distances from node 1 on the fixed weighted map.
{
  const frames = simulate('dijkstra', map);
  const last = frames.at(-1);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map(i => Number(last.sub[i])),
    [0, 4, 2, 9, 5, 5, 11]
  );
  assert.equal(last.edges.filter(e => e.state === 'tree').length, 6);
  for (const f of frames.slice(1)) {
    assert.equal(f.edges.length, 9);
    assert.ok(f.edges.every(e => states.has(e.state)));
    assert.equal(f.trays[0].label, 'FRONTIER');
  }
  assert.ok(frames.filter(f => f.ask).length >= 2);
  assert.ok(frames.some(f => f.ask?.kind === 'node') && frames.some(f => f.ask?.kind === 'bool'));
  checked++;
}

// Prim: six tree edges, connected, total weight 17.
{
  const frames = simulate('prim', map);
  const last = frames.at(-1);
  const tree = last.edges.filter(e => e.state === 'tree');
  assert.equal(tree.length, 6);
  assert.equal(
    tree.reduce((s, e) => s + e.weight, 0),
    17
  );
  assert.ok(last.message.includes('17'));
  assert.ok(frames.filter(f => f.ask?.kind === 'choice').length === 6);
  for (const f of frames.filter(f => f.ask)) assert.ok(f.ask.options.every(o => /^\d–\d \(\d\)$/.test(o)));
  checked++;
}

// Topological sort: a valid order over the directed map, seven entries.
{
  const frames = simulate('topo', map);
  const last = frames.at(-1);
  assert.deepEqual(last.output, [1, 2, 3, 4, 5, 6, 7]);
  const pos = new Map(last.output.map((v, i) => [v - 1, i]));
  for (const f of frames.slice(1)) {
    assert.equal(f.edges.length, 9);
    assert.ok(f.edges.every(e => e.directed === true && states.has(e.state)));
    assert.ok(f.edges.every(e => pos.get(e.from) < pos.get(e.to)));
  }
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map(i => last.sub[i]),
    ['0', '0', '0', '0', '0', '0', '0']
  );
  assert.equal(frames[1].sub[6], '3');
  assert.ok(frames.filter(f => f.ask).length >= 2);
  checked++;
}

// Heap insert: max-heap property after the insert, values preserved.
const heapInputs = [
  [4, 10, 3, 5, 1, 8, 6],
  [1, 2, 3],
  [5, 5, 5, 5],
  [20, 1, 20, 2, 2, 1],
  [7, 3, 9, 4, 6, 2, 8, 5],
];
for (const input of heapInputs)
  for (const target of [6, 8, 99, 1]) {
    const frames = simulate('heapInsert', input, target);
    const last = frames.at(-1);
    assert.ok(isMaxHeap(last.values), `heapInsert ${input} + ${target}`);
    assert.deepEqual(sortedAsc(last.values), sortedAsc([...input, target]));
    assert.equal(last.nodes.length, input.length + 1);
    assert.ok(frames.some(f => f.ask?.kind === 'bool'));
    checked++;
  }
assert.ok(simulate('heapInsert', [4, 10, 3, 5, 1, 8, 6], 9).filter(f => f.ask).length >= 2);

// Extract max: output holds the largest values in descending order, the rest stays a heap.
for (const input of [[3, 9, 4, 7, 1, 6, 2], ...heapInputs]) {
  const frames = simulate('extractMax', input);
  const last = frames.at(-1);
  const k = input.length <= 3 ? 1 : 2;
  assert.equal(last.output.length, k);
  assert.deepEqual(last.output, sortedAsc(input).reverse().slice(0, k));
  assert.ok(isMaxHeap(last.values), `extractMax ${input}`);
  assert.deepEqual(sortedAsc([...last.values, ...last.output]), sortedAsc(input));
  assert.equal(last.nodes.length, input.length - k);
  assert.ok(frames.some(f => f.ask?.kind === 'choice'));
  checked++;
}
assert.ok(simulate('extractMax', [3, 9, 4, 7, 1, 6, 2]).filter(f => f.ask).length >= 2);

console.log(`${checked} graph and heap lesson runs passed.`);
