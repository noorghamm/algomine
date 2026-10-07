import assert from 'node:assert/strict';
import { simulate } from '../../dist/algorithms.mjs';

const sorted = values => [...values].sort((x, y) => x - y);
const cases = [
  [7, 3, 9, 4, 6, 2, 8, 5],
  [1, 2, 3],
  [3, 2, 1],
  [5, 5, 5, 5],
  [20, 1, 20, 2, 2, 1],
  [8, 4, 12, 2, 6, 10, 14],
  [99, 5, 42, 7, 99, 10, 1],
];

let checked = 0;

// Heapsort: swaps are animated, a max heap exists before the first extraction, the sorted suffix grows.
for (const values of cases) {
  const frames = simulate('heapsort', values);
  assert.deepEqual(frames.at(-1).values, sorted(values));
  assert.ok(
    frames.some(f => f.swapping && f.active.length === 2),
    'heapsort: swapping frames'
  );
  const built = frames.find(f => f.message.startsWith('Max heap built'));
  assert.ok(built, 'heapsort: heap built frame');
  const h = built.values;
  for (let i = 1; i < h.length; i++) assert.ok(h[Math.floor((i - 1) / 2)] >= h[i], 'heapsort: heap property');
  let lastMarked = 0;
  for (const f of frames) {
    assert.ok(f.marked.length >= lastMarked, 'heapsort: sorted suffix only grows');
    lastMarked = f.marked.length;
    for (const i of f.marked) assert.ok(i < values.length, 'heapsort: marked indices valid');
  }
  // Every marked index holds its final sorted value from the moment it is marked.
  for (const f of frames.slice(0, -1))
    for (const i of f.marked) assert.equal(f.values[i], sorted(values)[i], 'heapsort: fixed block is final');
  assert.ok(
    frames.some(f => f.ask?.kind === 'bool'),
    'heapsort: bool ask'
  );
  assert.ok(
    frames.some(f => f.ask?.kind === 'choice'),
    'heapsort: choice ask'
  );
  assert.ok(frames.at(-1).comparisons > 0, 'heapsort: counts comparisons');
  checked++;
}

// Counting sort: zero comparisons, a count tray, stable placement from the right.
for (const values of cases) {
  const frames = simulate('counting', values);
  const last = frames.at(-1);
  assert.deepEqual(last.values, sorted(values));
  assert.equal(last.comparisons, 0, 'counting: no comparisons');
  assert.ok(last.moves >= values.length, 'counting: counts moves');
  const withTrays = frames.filter(f => f.trays);
  assert.ok(withTrays.length > 0, 'counting: trays shown');
  assert.ok(
    withTrays.every(f => f.trays[0].label.startsWith('COUNTS')),
    'counting: first tray is the count tray'
  );
  const max = Math.max(...values);
  assert.equal(withTrays[0].trays[0].values.length, max, 'counting: count tray spans 1 to max');
  // After tallying, the counts match the multiset of the input.
  const firstPrefix = frames.findIndex(f => f.line === 2);
  const tallyFrame = firstPrefix >= 0 ? frames[firstPrefix - 1] : frames.find(f => f.line === 3);
  for (let v = 1; v <= max; v++)
    assert.equal(tallyFrame.trays[0].values[v - 1], values.filter(x => x === v).length, 'counting: tally');
  const indexAsk = frames.find(f => f.ask?.kind === 'index');
  assert.ok(indexAsk, 'counting: index ask');
  assert.equal(indexAsk.ask.tray, 0, 'counting: index ask targets the count tray');
  assert.equal(
    indexAsk.ask.answer,
    values[0] - 1,
    'counting: index ask answer is the bucket of the first block'
  );
  assert.ok(
    frames.some(f => f.ask?.kind === 'choice'),
    'counting: choice ask'
  );
  // Stability: blocks are taken right to left, and equal keys fill output slots right to left.
  const placements = frames.filter(f => f.message.startsWith('Place'));
  assert.equal(placements.length, values.length, 'counting: one placement per block');
  const slotOf = new Map();
  placements.forEach((f, k) => {
    const from = f.active[0];
    assert.equal(from, values.length - 1 - k, 'counting: walks right to left');
    const slot = f.trays[1].active[0];
    assert.equal(f.trays[1].values[slot], values[from], 'counting: output slot holds the block');
    slotOf.set(from, slot);
  });
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++)
      if (values[i] === values[j]) assert.ok(slotOf.get(i) < slotOf.get(j), 'counting: stable on equal keys');
  checked++;
}

// Radix sort: zero comparisons, ten bucket trays, one pass per digit, stable within a pass.
for (const values of cases) {
  const frames = simulate('radix', values);
  const last = frames.at(-1);
  assert.deepEqual(last.values, sorted(values));
  assert.equal(last.comparisons, 0, 'radix: no comparisons');
  assert.ok(last.moves >= values.length, 'radix: counts moves');
  const passes = String(Math.max(...values)).length;
  const rebuilds = frames.filter(f => f.message.startsWith('Rebuild'));
  assert.equal(rebuilds.length, passes, 'radix: one rebuild per digit');
  const withTrays = frames.filter(f => f.trays);
  assert.ok(
    withTrays.every(f => f.trays.length === 10),
    'radix: ten buckets'
  );
  assert.deepEqual(
    withTrays[0].trays.map(t => t.label),
    Array.from({ length: 10 }, (_, d) => String(d)),
    'radix: bucket labels 0 to 9'
  );
  // After the first pass the row is ordered by ones digit, with ties in input order.
  const firstPass = rebuilds[0].values;
  const key = v => v % 10;
  for (let i = 1; i < firstPass.length; i++)
    assert.ok(key(firstPass[i - 1]) <= key(firstPass[i]), 'radix: ones order');
  const expectedFirst = [...values].sort((x, y) => key(x) - key(y));
  assert.deepEqual(firstPass, expectedFirst, 'radix: first pass is stable');
  const asks = frames.filter(f => f.ask);
  assert.ok(asks.length >= 2, 'radix: at least two asks');
  for (const f of asks) {
    assert.equal(f.ask.kind, 'choice');
    assert.deepEqual(
      f.ask.options,
      Array.from({ length: 10 }, (_, d) => String(d))
    );
  }
  checked++;
}

// Two-digit values force two passes and the sample input stays untouched.
{
  const input = [20, 1, 20, 2, 2, 1];
  const snapshot = JSON.stringify(input);
  const frames = simulate('radix', input);
  assert.equal(JSON.stringify(input), snapshot, 'radix: input not mutated');
  assert.equal(frames.filter(f => f.message.startsWith('Pass')).length, 2, 'radix: two passes for 20');
  assert.deepEqual(frames.at(-1).values, [1, 1, 2, 2, 20, 20]);
  const big = simulate('radix', [99, 5, 42, 7, 99, 10, 1]);
  assert.deepEqual(big.at(-1).values, [1, 5, 7, 10, 42, 99, 99]);
  checked += 2;
}

console.log(`${checked} sorting lesson checks passed.`);

// Property checks over random inputs for every lesson in the sorting topic.
{
  const { topics } = await import('../../dist/algorithms.mjs');
  const sortingLessons = topics.find(t => t.id === 'sorting').algorithms;
  const seed = Number(process.env.SORT_SEED || 20261007);
  let state = seed >>> 0;
  const rng = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const randomInput = () => {
    const n = Math.floor(rng() * 41); // 0 to 40
    const spread = rng() < 0.3 ? 4 : 20; // a narrow range forces duplicates
    return Array.from({ length: n }, () => 1 + Math.floor(rng() * spread));
  };
  const inputs = [];
  for (let i = 0; i < 50; i++) inputs.push(randomInput());
  const base = Array.from({ length: 25 }, () => 1 + Math.floor(rng() * 20));
  inputs.push([], [7], sorted(base), sorted(base).reverse(), Array(12).fill(9));
  const multiset = values => JSON.stringify(sorted(values));
  const isSorted = values => values.every((v, i) => i === 0 || values[i - 1] <= v);
  const swapDistance = (a, b) => {
    if (a.length !== b.length) return Infinity;
    const diff = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 0) return 0;
    if (diff.length === 2 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return 1;
    return Infinity;
  };

  let runs = 0;
  for (const id of sortingLessons) {
    for (const input of inputs) {
      const label = `${id} on ${JSON.stringify(input)} (seed ${seed})`;
      const frames = simulate(id, input);
      const last = frames.at(-1).values;
      assert.ok(isSorted(last), `${label}: final values are not sorted: ${JSON.stringify(last)}`);
      assert.equal(
        multiset(last),
        multiset(input),
        `${label}: final values are not a permutation of the input`
      );
      const swaps = frames.some(f => f.swapping);
      if (swaps)
        for (let i = 1; i < frames.length; i++)
          assert.ok(
            swapDistance(frames[i - 1].values, frames[i].values) <= 1,
            `${label}: frames ${i - 1} and ${i} differ by more than one swap: ${JSON.stringify(frames[i - 1].values)} -> ${JSON.stringify(frames[i].values)}`
          );
      runs++;
    }
  }
  console.log(
    `${runs} random-input property runs passed across ${sortingLessons.length} sorting lessons (seed ${seed}).`
  );
}
