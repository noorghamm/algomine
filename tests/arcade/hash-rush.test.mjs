import assert from 'node:assert/strict';
import { makeRound, probe, explain } from '../../dist/arcade/hash-rush.mjs';

// Small seeded generator so the test is repeatable.
const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Independent linear-probing simulation, written without looking at the game helper.
function linearProbing(values, modulus) {
  const table = Array(modulus).fill(null);
  const placements = [];
  let collisions = 0;
  for (const v of values) {
    const home = v % modulus;
    let slot = home;
    let steps = 0;
    while (table[slot] !== null) {
      slot = (slot + 1) % modulus;
      steps++;
    }
    if (steps > 0) collisions++;
    table[slot] = v;
    placements.push(slot);
  }
  return { placements, collisions };
}

let checked = 0;
for (let seed = 1; seed <= 40; seed++) {
  for (const modulus of [7, 11, 13]) {
    const rng = mulberry(seed * 31 + modulus);
    const { values, placements } = makeRound(rng, modulus);
    assert.equal(values.length, 7, 'seven values per round');
    assert.equal(new Set(values).size, 7, 'values are distinct');
    assert.ok(
      values.every(v => Number.isInteger(v) && v >= 1 && v <= 99),
      'values lie in 1 to 99'
    );
    const ref = linearProbing(values, modulus);
    assert.deepEqual(placements, ref.placements, `placements match linear probing for mod ${modulus}`);
    assert.ok(ref.collisions >= 2, `at least two collisions (got ${ref.collisions})`);
    assert.equal(new Set(placements).size, 7, 'every value lands in its own chest');
    assert.ok(
      placements.every(s => s >= 0 && s < modulus),
      'placements stay inside the table'
    );
    checked++;
  }
}

// A constant rng draws the same values every attempt, which exercises the forced-collision fallback.
{
  const { values, placements } = makeRound(() => 0.5, 11);
  assert.equal(new Set(values).size, 7);
  assert.ok(linearProbing(values, 11).collisions >= 2);
  assert.deepEqual(placements, linearProbing(values, 11).placements);
}

// probe() agrees with the reference on a hand-made collision chain that wraps around.
{
  const values = [10, 21, 32, 5];
  assert.deepEqual(probe(values, 11), { placements: [10, 0, 1, 5], collisions: 2 });
  assert.deepEqual(probe(values, 11).placements, linearProbing(values, 11).placements);
}

assert.match(explain(21, 11, 0), /21 mod 11 = 10/);
assert.match(explain(21, 11, 0), /chest 0/);
assert.match(explain(5, 11, 5), /free/);

console.log(`hash-rush: ${checked} rounds checked.`);
