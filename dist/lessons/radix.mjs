import { ask } from './recorder.mjs';

const digitNames = ['ones', 'tens', 'hundreds', 'thousands'];

export default {
  id: 'radix',
  topic: 'sorting',
  name: 'Radix sort',
  time: 'O(d (n + 10))',
  space: 'O(n + 10)',
  view: 'bars',
  sample: { input: [17, 3, 20, 4, 16, 2, 18, 5] },
  intro:
    'Sort by one digit at a time, starting from the ones digit. Each pass drops every block into one of ten buckets and then rebuilds the row from bucket 0 to bucket 9.',
  insight:
    'LSD radix sort works because every pass is stable: blocks with the same current digit keep the order the earlier passes gave them. With d digits it costs O(d (n + 10)) and never compares two blocks.',
  code: [
    'for digit = ones, tens, ... while 10^digit <= max',
    '  empty the ten buckets',
    '  for each block v in row order: d = floor(v / 10^digit) mod 10',
    '    append v to bucket d',
    '  rebuild the row from bucket 0 through bucket 9',
    'return sorted array',
  ],
  quiz: [
    {
      question: 'Why must each pass of LSD radix sort be stable?',
      answers: [
        'So the order from earlier digits survives when a later digit ties',
        'So the buckets stay small',
        'So the largest digit is handled first',
      ],
      correct: 0,
      reason:
        'Blocks that tie on the tens digit are already ordered by the ones digit, and only a stable pass keeps that order.',
    },
    {
      question: 'How many passes does base-10 radix sort need for values up to 99?',
      answers: ['Two, one per digit', 'Ten, one per bucket', 'One, because the buckets sort everything'],
      correct: 0,
      reason: 'Values up to 99 have at most two decimal digits, and each pass handles one digit position.',
    },
    {
      question: 'Which bucket does 37 go to on the tens pass?',
      answers: ['Bucket 3', 'Bucket 7', 'Bucket 0'],
      correct: 0,
      reason: 'The tens digit of 37 is 3, so it joins bucket 3 on that pass.',
    },
  ],
  run(r) {
    const n = r.a.length;
    const max = Math.max(...r.a);
    const passes = String(Math.max(max, 0)).length;
    const digitOptions = Array.from({ length: 10 }, (_, d) => String(d));
    const askLimit = 3;

    for (let pass = 0; pass < passes; pass++) {
      const place = 10 ** pass;
      const name = digitNames[pass] ?? `10^${pass}`;
      const buckets = Array.from({ length: 10 }, () => []);
      const trays = active =>
        buckets.map((values, d) => ({
          label: String(d),
          values: [...values],
          active: active === d ? [values.length - 1] : [],
        }));

      r.emit(`Pass ${pass + 1}: sort by the ${name} digit. Empty the ten buckets.`, 1, [], {
        trays: trays(),
      });
      const row = [...r.a];
      for (let i = 0; i < n; i++) {
        const v = row[i];
        const d = Math.floor(v / place) % 10;
        const extra = { trays: trays() };
        if (i < askLimit)
          extra.ask = ask(
            'choice',
            `Block ${v}: which bucket does it go to on the ${name} digit?`,
            d,
            digitOptions
          );
        r.emit(`Block ${v} at index ${i}. Read its ${name} digit.`, 2, [i], extra);
        buckets[d].push(v);
        r.move();
        r.discarded.push(i);
        r.emit(`The ${name} digit of ${v} is ${d}. Drop it into bucket ${d}.`, 3, [i], { trays: trays(d) });
      }

      const rebuilt = buckets.flat();
      for (let i = 0; i < n; i++) r.a[i] = rebuilt[i];
      r.move(n);
      r.discarded = [];
      r.emit(
        `Rebuild the row from bucket 0 through bucket 9. The row is now sorted by the ${name} digit.`,
        4,
        r.a.map((_, i) => i),
        { trays: trays() }
      );
    }
    r.marked = r.a.map((_, i) => i);
    r.emit(`Sorted after ${passes} pass${passes === 1 ? '' : 'es'} with zero comparisons.`, 5);
  },
  check(input, last) {
    return JSON.stringify(last.values) === JSON.stringify([...input].sort((x, y) => x - y));
  },
};
