import { ask } from './recorder.mjs';

export default {
  id: 'hash',
  topic: 'hash',
  name: 'Hashing: linear probing',
  time: 'O(1) avg. / insert',
  space: 'O(m)',
  intro:
    'Map each value to value mod 11. If its chest is occupied, try the next chest until you find an empty slot.',
  insight:
    'Linear probing resolves collisions. Each insertion is O(m) in the worst case; expected constant time needs a suitable hash and low load.',
  code: [
    'for value in input',
    '  slot = value mod 11',
    '  while table[slot] is occupied',
    '    slot = (slot + 1) mod 11',
    '  table[slot] = value',
    'return table',
  ],
  quiz: [
    {
      question: 'Two values map to the same occupied slot. What does linear probing do?',
      answers: ['Deletes the previous value', 'Tries the next slot, wrapping around', 'Drops the new value'],
      correct: 1,
      reason: 'Probe consecutive slots until you find an empty one, wrapping from the final slot to zero.',
    },
    {
      question: 'What is the load factor of a table with 11 slots holding 5 values?',
      answers: ['5 / 11', '11 / 5', '5'],
      correct: 0,
      reason: 'Load factor is occupied slots divided by table size, and it drives the expected probe length.',
    },
    {
      question: 'What problem does linear probing suffer from as the table fills up?',
      answers: ['Primary clustering: long runs of occupied slots', 'Negative hash values', 'Duplicate keys'],
      correct: 0,
      reason: 'Collisions land next to each other and runs grow, so probes get longer and longer.',
    },
  ],
  prepare(r) {
    r.a = Array(11).fill(null);
  },
  run(r) {
    const a = r.a;
    r.emit('Eleven empty chests. Hash rule: value mod 11.', 0);
    for (const value of r.input) {
      let slot = value % 11;
      const final = (() => {
        let s = slot;
        while (a[s] !== null) s = (s + 1) % 11;
        return s;
      })();
      r.frames.at(-1).ask = ask(
        'index',
        `${value} mod 11 = ${slot}. Which chest will ${value} end up in?`,
        final
      );
      r.emit(`${value} mod 11 = ${slot}. Try chest ${slot}.`, 1, [slot], { incoming: value });
      while (a[slot] !== null) {
        r.compare();
        r.emit(`Collision: chest ${slot} contains ${a[slot]}.`, 2, [slot], {
          incoming: value,
          swapping: true,
        });
        slot = (slot + 1) % 11;
        r.emit(`Probe the next chest: ${slot}.`, 3, [slot], { incoming: value });
      }
      a[slot] = value;
      r.marked.push(slot);
      r.move();
      r.emit(`Store ${value} in chest ${slot}.`, 4, [slot]);
    }
    r.emit('All values stored. Collisions resolved with linear probing.', 5);
  },
  check(input, last) {
    const stored = last.values.filter(v => v !== null).sort((x, y) => x - y);
    return JSON.stringify(stored) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
