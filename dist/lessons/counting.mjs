import { ask } from './recorder.mjs';

export default {
  id: 'counting',
  topic: 'sorting',
  name: 'Counting sort',
  time: 'O(n + k)',
  space: 'O(n + k)',
  view: 'bars',
  intro:
    'Count how many blocks have each value, turn the counts into running totals, then drop every block straight into its slot. No two blocks are ever compared.',
  insight:
    'Counting sort is not comparison based, so the n log n lower bound does not apply. It runs in O(n + k) where k is the largest value, which is only a win when k is small. Walking the input from the end keeps equal keys in their original order, so it is stable.',
  code: [
    'count[v] = 0 for every value v from 1 to k',
    'for each block v: count[v] += 1',
    'for v = 2 to k: count[v] += count[v − 1]',
    'for i = n − 1 down to 0:',
    '  count[a[i]] −= 1; out[count[a[i]]] = a[i]',
    'copy out back into a',
    'return sorted array',
  ],
  quiz: [
    {
      question: 'How many comparisons between blocks does counting sort make?',
      answers: ['None', 'About n log n', 'About n²'],
      correct: 0,
      reason: 'Values are used as indices into the count tray, so blocks are never compared with each other.',
    },
    {
      question: 'After the prefix sums, what does count[v] tell you?',
      answers: [
        'How many blocks have value at most v',
        'How many blocks have value exactly v',
        'The index of the first block with value v',
      ],
      correct: 0,
      reason:
        'Each running total adds up all counts for smaller values, giving the number of blocks that are at most v.',
    },
    {
      question: 'When is counting sort a poor choice?',
      answers: [
        'When the largest value k is much bigger than n',
        'When the input has duplicates',
        'When the input is already sorted',
      ],
      correct: 0,
      reason:
        'The count tray has k slots, so a huge range of values costs far more time and memory than n blocks deserve.',
    },
  ],
  run(r) {
    const a = r.a;
    const n = a.length;
    const lo = Math.min(1, ...a);
    const hi = Math.max(...a);
    const counts = Array.from({ length: hi - lo + 1 }, () => 0);
    const out = Array.from({ length: n }, () => null);
    const countTray = active => ({
      label: `COUNTS ${lo}–${hi}`,
      values: [...counts],
      active: active === undefined ? [] : [active],
    });
    const outTray = active => ({
      label: 'OUTPUT',
      values: [...out],
      active: active === undefined ? [] : [active],
    });
    const askLimit = 3;

    r.emit(`Lay out a count tray with one chest per value from ${lo} to ${hi}, all empty.`, 0, [], {
      trays: [countTray()],
    });

    // Step 1: tally every block.
    for (let i = 0; i < n; i++) {
      const v = a[i];
      const extra = { trays: [countTray()] };
      if (i < askLimit)
        extra.ask = { ...ask('index', `Block ${v}: which count chest does it bump?`, v - lo), tray: 0 };
      r.emit(`Next block: ${v} at index ${i}.`, 1, [i], extra);
      counts[v - lo]++;
      r.emit(`count[${v}] is now ${counts[v - lo]}.`, 1, [i], { trays: [countTray(v - lo)] });
    }

    // Step 2: prefix sums.
    for (let v = lo + 1; v <= hi; v++) {
      counts[v - lo] += counts[v - lo - 1];
      r.emit(`count[${v}] += count[${v - 1}], giving ${counts[v - lo]} blocks at most ${v}.`, 2, [], {
        trays: [countTray(v - lo)],
      });
    }

    // Step 3: place blocks from the end so equal keys keep their order.
    let placed = 0;
    for (let i = n - 1; i >= 0; i--) {
      const v = a[i];
      const slot = counts[v - lo] - 1;
      const extra = { trays: [countTray(v - lo), outTray()] };
      if (placed < askLimit) {
        const candidates = [slot, slot + 1, slot - 1, slot + 2, slot - 2].filter(s => s >= 0 && s < n);
        const options = [...new Set(candidates)].slice(0, 3).sort((x, y) => x - y);
        if (options.length >= 2)
          extra.ask = ask(
            'choice',
            `Block ${v} at index ${i}: count[${v}] is ${counts[v - lo]}. Which output slot does it land in?`,
            options.indexOf(slot),
            options.map(s => `Slot ${s}`)
          );
      }
      r.emit(`Take ${v} from index ${i}, walking right to left.`, 3, [i], extra);
      counts[v - lo]--;
      out[slot] = v;
      r.move();
      r.discarded.push(i);
      placed++;
      r.emit(`Place ${v} in output slot ${slot}. count[${v}] drops to ${counts[v - lo]}.`, 4, [i], {
        trays: [countTray(v - lo), outTray(slot)],
      });
    }

    // Step 4: copy the output row back.
    for (let i = 0; i < n; i++) a[i] = out[i];
    r.move(n);
    r.discarded = [];
    r.marked = a.map((_, i) => i);
    r.emit('Copy the output row back into the block row.', 5, [], { trays: [countTray(), outTray()] });
    r.emit('Sorted with zero comparisons, in O(n + k) time.', 6);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
