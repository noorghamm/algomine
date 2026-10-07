import { ask } from './recorder.mjs';

const SLOTS = 7;
const slotOf = value => ((value % SLOTS) + SLOTS) % SLOTS;

export default {
  id: 'chaining',
  topic: 'hash',
  name: 'Hashing: separate chaining',
  time: 'O(1 + α) avg. / insert',
  space: 'O(n + m)',
  view: 'hash',
  sample: { input: [10, 3, 17, 8, 12, 24] },
  intro:
    'Seven chests, and each chest holds a chain of blocks. A value goes to chest value mod 7. Before appending it at the back of the chain, walk the chain to make sure it is not already there.',
  insight:
    'Chaining never runs out of room: collisions just lengthen a chain. The cost of an insert or lookup is the chain length, which averages the load factor α = n / m, so keep α small by growing the table.',
  code: [
    'table = 7 empty chains',
    'for value in input',
    '  slot = value mod 7',
    '  for item in table[slot]',
    '    if item == value: skip (duplicate)',
    '  table[slot].append(value)',
    'return table',
  ],
  quiz: [
    {
      question: 'Two values hash to the same chest. What does separate chaining do?',
      answers: ['Stores both in the same chain', 'Probes the next chest', 'Rejects the second value'],
      correct: 0,
      reason: 'Each slot holds a list, so colliding values simply share the chain.',
    },
    {
      question: 'What is the load factor of 6 values in a 7-slot chained table?',
      answers: ['6 / 7', '7 / 6', '1'],
      correct: 0,
      reason: 'Load factor is n / m, and with chaining it can even exceed 1.',
    },
    {
      question: 'Which quantity decides the cost of looking up a value with chaining?',
      answers: [
        'The length of the chain in its slot',
        'The total number of slots',
        'The largest value stored',
      ],
      correct: 0,
      reason: 'Only the chain at value mod 7 is walked, so a long chain means a slow lookup.',
    },
  ],
  prepare(r) {
    r.a = Array.from({ length: SLOTS }, () => []);
  },
  run(r) {
    const a = r.a;
    r.emit('Seven empty chests, each with room for a chain. Hash rule: value mod 7.', 0);
    let stored = 0;
    for (const value of r.input) {
      const slot = slotOf(value);
      r.frames.at(-1).ask = ask('index', `Which chest does ${value} hash to? (value mod 7)`, slot);
      r.emit(`${value} mod 7 = ${slot}. Open chest ${slot}.`, 2, [slot], { incoming: value });
      let duplicate = false;
      for (const item of a[slot]) {
        r.compare();
        if (item === value) {
          duplicate = true;
          r.emit(
            `Compare ${value} with ${item}: equal. ${value} is already in chest ${slot}, skip it.`,
            4,
            [slot],
            {
              incoming: value,
            }
          );
          break;
        }
        r.emit(`Compare ${value} with ${item}: different. Keep walking the chain.`, 3, [slot], {
          incoming: value,
        });
      }
      if (duplicate) continue;
      a[slot].push(value);
      stored++;
      r.move();
      if (!r.marked.includes(slot)) r.marked.push(slot);
      r.emit(
        a[slot].length === 1
          ? `Chest ${slot} was empty. Start its chain with ${value}.`
          : `Append ${value} at the back of chain ${slot}: ${a[slot].join(' → ')}.`,
        5,
        [slot]
      );
    }
    const longest = Math.max(...a.map(c => c.length));
    const where = a.map((c, i) => (c.length === longest ? i : -1)).filter(i => i >= 0);
    r.emit(
      `Done. Longest chain: ${longest} block${longest === 1 ? '' : 's'} in chest ${where.join(' and ')}. Load factor: ${stored} / 7 ≈ ${(stored / SLOTS).toFixed(2)}.`,
      6,
      where
    );
  },
  check(input, last) {
    const chains = last.values;
    if (!Array.isArray(chains) || chains.length !== SLOTS) return false;
    const seen = new Set();
    for (let s = 0; s < SLOTS; s++)
      for (const v of chains[s]) {
        if (slotOf(v) !== s || seen.has(v)) return false;
        seen.add(v);
      }
    const unique = new Set(input);
    return seen.size === unique.size && [...unique].every(v => seen.has(v));
  },
};
