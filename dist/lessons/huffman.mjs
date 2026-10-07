import { ask } from './recorder.mjs';

// Rune frequencies as [char, count] pairs, lightest first, ties broken by the rune itself.
export function frequencies(chars) {
  const counts = new Map();
  for (const ch of chars) counts.set(ch, (counts.get(ch) || 0) + 1);
  return [...counts].sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}

// Total encoded bits of an optimal Huffman code, computed with a plain sorted queue.
export function optimalBits(chars) {
  const queue = frequencies(chars).map(([, count]) => count);
  if (queue.length === 1) return queue[0];
  let bits = 0;
  while (queue.length > 1) {
    queue.sort((x, y) => x - y);
    const merged = queue.shift() + queue.shift();
    bits += merged;
    queue.push(merged);
  }
  return bits;
}

export default {
  id: 'huffman',
  topic: 'compress',
  name: 'Huffman coding',
  time: 'O(k log k)',
  space: 'O(k)',
  view: 'forest',
  inputKind: 'text',
  sample: { input: 'abracadabra' },
  intro:
    'Count how often each rune appears, then keep joining the two lightest trees until one tree remains. Frequent runes end up near the root and get short codes.',
  insight:
    'Every rune sits on a leaf, so no code is a prefix of another and the bits decode without separators. Greedily merging the two lightest weights gives the shortest possible total length.',
  code: [
    'count the frequency of every rune',
    'make a leaf for each rune, weight = frequency',
    'while more than one root remains',
    '  take the two lightest roots',
    '  join them under a new node, weight = sum',
    'walk the tree: left adds 0, right adds 1',
    'return the code of every rune',
  ],
  quiz: [
    {
      question: 'Which two trees does Huffman coding merge at each step?',
      answers: ['The two lightest roots', 'The two tallest trees', 'The two most recent leaves'],
      correct: 0,
      reason: 'Merging the lightest pair pushes rare runes deeper, which keeps the total bit count minimal.',
    },
    {
      question: 'Why can a Huffman code be decoded without separators between codes?',
      answers: [
        'Every code has the same length',
        'No code is a prefix of another, because runes live only on leaves',
        'The decoder knows the message length',
      ],
      correct: 1,
      reason: 'A prefix-free code means the decoder knows a rune is complete as soon as it reaches a leaf.',
    },
    {
      question: 'Which rune gets the shortest code?',
      answers: ['The rarest one', 'The most frequent one', 'The first one in the message'],
      correct: 1,
      reason: 'Frequent runes are merged last, so they sit closest to the root.',
    },
  ],
  prepare(r) {
    r.a = [];
  },
  run(r) {
    const chars = r.input;
    const freq = frequencies(chars);
    const weight = new Map();
    const tray = () => [{ label: 'FREQUENCIES', values: freq.map(([ch, count]) => `${ch}:${count}`) }];
    const sub = () => Object.fromEntries([...weight].map(([id, w]) => [id, String(w)]));

    r.emit(
      chars.length
        ? `The furnace reads "${chars.join('')}": ${chars.length} runes, ${freq.length} distinct. Count each one.`
        : 'The furnace is empty. There is nothing to compress.',
      0,
      [],
      { roots: [], sub: {}, trays: tray() }
    );
    if (!chars.length) {
      r.emit('No runes, no codes. Total 0 bits.', 6, [], { roots: [], sub: {}, trays: tray() });
      return;
    }

    let roots = [];
    for (const [ch, count] of freq) {
      const id = r.nodes.length;
      r.nodes.push({ id, value: ch, left: null, right: null });
      weight.set(id, count);
      roots.push(id);
    }
    r.emit('One leaf per rune, lightest on the left. The small number is its weight.', 1, [...roots], {
      roots: [...roots],
      sub: sub(),
      trays: tray(),
    });

    const describe = id => {
      const node = r.nodes[id];
      return node.left === null ? `"${node.value}" (${weight.get(id)})` : `tree of weight ${weight.get(id)}`;
    };
    const position = id => `#${roots.indexOf(id) + 1}`;
    const pair = (x, y) => `${position(x)} ${describe(x)} + ${position(y)} ${describe(y)}`;

    while (roots.length > 1) {
      const order = [...roots].sort((x, y) => weight.get(x) - weight.get(y) || x - y);
      const [x, y, z] = order;
      const extra = { roots: [...roots], sub: sub(), trays: tray() };
      if (z !== undefined) {
        const options = [pair(x, y), pair(x, z), pair(y, z)];
        const rot = roots.length % 3,
          rotated = [...options.slice(rot), ...options.slice(0, rot)];
        extra.ask = ask('choice', 'Which two roots merge next?', rotated.indexOf(options[0]), rotated);
      }
      r.emit(`${roots.length} roots remain. Find the two lightest, counting left to right.`, 2, [], extra);
      r.emit(`Take ${describe(x)} and ${describe(y)}.`, 3, [x, y], {
        roots: [...roots],
        sub: sub(),
        trays: tray(),
      });
      const id = r.nodes.length;
      r.nodes.push({ id, value: '*', left: x, right: y });
      weight.set(id, weight.get(x) + weight.get(y));
      r.move();
      roots = [...roots.filter(root => root !== x && root !== y), id];
      r.emit(`Join them under a new node of weight ${weight.get(id)}.`, 4, [id], {
        roots: [...roots],
        sub: sub(),
        trays: tray(),
      });
    }

    const root = roots[0];
    const codes = new Map();
    const walk = (id, code) => {
      const node = r.nodes[id];
      if (node.left === null) {
        codes.set(id, code || '0');
        return;
      }
      walk(node.left, code + '0');
      walk(node.right, code + '1');
    };
    walk(root, '');
    r.emit('One tree is left. Walk it: every left branch adds a 0, every right branch adds a 1.', 5, [root], {
      roots: [root],
      sub: sub(),
      trays: tray(),
    });
    let bits = 0;
    for (const [id, code] of codes) {
      const node = r.nodes[id];
      bits += code.length * weight.get(id);
      r.output.push(`${node.value}=${code}`);
      r.marked.push(id);
      r.emit(
        `"${node.value}" = ${code}: ${code.length} bit${code.length > 1 ? 's' : ''} times ${weight.get(id)} uses.`,
        5,
        [id],
        {
          roots: [root],
          sub: sub(),
          trays: tray(),
        }
      );
    }
    r.emit(
      `Total ${bits} bits instead of ${chars.length * 8} at 8 bits per rune. ${freq.length === 1 ? 'A single rune gets the code 0.' : 'Frequent runes got the short codes.'}`,
      6,
      [root],
      { roots: [root], sub: sub(), trays: tray() }
    );
  },
  check(input, last) {
    const codes = last.output.map(entry => {
      const at = entry.indexOf('=');
      return [entry.slice(0, at), entry.slice(at + 1)];
    });
    const freq = new Map(frequencies(input));
    if (codes.length !== freq.size) return false;
    for (const [ch, code] of codes) if (!freq.has(ch) || !/^[01]+$/.test(code)) return false;
    for (const [ch, code] of codes)
      for (const [other, otherCode] of codes) if (ch !== other && otherCode.startsWith(code)) return false;
    const bits = codes.reduce((sum, [ch, code]) => sum + code.length * freq.get(ch), 0);
    return bits === (input.length ? optimalBits(input) : 0);
  },
};
