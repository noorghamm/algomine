import { ask } from './recorder.mjs';

// The lesson keeps a nested tree {value, left, right, height} and flattens it into r.nodes
// (pre-order numbering, root id 0) after every structural change.
const height = n => (n ? n.height : 0);
const balance = n => height(n.left) - height(n.right);
const refresh = n => {
  n.height = 1 + Math.max(height(n.left), height(n.right));
  return n;
};
const fmt = b => (b > 0 ? `+${b}` : `${b}`);

function rotateRight(z) {
  const y = z.left;
  z.left = y.right;
  y.right = z;
  refresh(z);
  return refresh(y);
}

function rotateLeft(z) {
  const y = z.right;
  z.right = y.left;
  y.left = z;
  refresh(z);
  return refresh(y);
}

// Flatten the nested tree. Returns the node list plus a sub label per id with height and balance.
function flatten(root) {
  const nodes = [],
    sub = {};
  const walk = n => {
    if (!n) return null;
    const id = nodes.length;
    const flat = { id, value: n.value, left: null, right: null };
    nodes.push(flat);
    sub[id] = `h=${n.height} b=${fmt(balance(n))}`;
    flat.left = walk(n.left);
    flat.right = walk(n.right);
    return id;
  };
  walk(root);
  return { nodes, sub };
}

export default {
  id: 'avl',
  topic: 'balanced',
  name: 'AVL insertion',
  time: 'O(log n)',
  space: 'O(1)',
  view: 'tree',
  inputKind: 'numbers',
  sample: { input: [10, 20, 30, 25, 28, 5] },
  intro:
    'Insert each value like a normal BST, then walk back up checking every ancestor. Balance is left height minus right height. When it reaches +2 or -2, rotate to shorten the branch.',
  insight:
    'Rotations keep the height O(log n), so search, insert and delete all stay logarithmic. An insertion needs at most one rotation (single or double): afterwards the subtree is as tall as before the insert, so no ancestor above it can be unbalanced.',
  code: [
    'insert(value):',
    '  walk down from the root and attach a new leaf',
    '  for each ancestor z, from the new leaf up to the root',
    '    z.height = 1 + max(height(z.left), height(z.right)); balance = height(z.left) − height(z.right)',
    '    if balance is −1, 0 or +1: continue',
    '    if balance > 1 and value < z.left.value: rotate right at z (LL)',
    '    if balance > 1 and value > z.left.value: rotate left at z.left, then right at z (LR)',
    '    if balance < −1 and value > z.right.value: rotate left at z (RR)',
    '    if balance < −1 and value < z.right.value: rotate right at z.right, then left at z (RL)',
    '  every balance is −1, 0 or +1 again',
  ],
  quiz: [
    {
      question: 'A node has left height 3 and right height 1. What must happen?',
      answers: ['Nothing, that is allowed', 'A rotation, because the balance is +2', 'The node is deleted'],
      correct: 1,
      reason: 'AVL allows a balance of -1, 0 or +1 only, so a difference of 2 triggers a rotation.',
    },
    {
      question: 'When is a double rotation (LR or RL) needed instead of a single one?',
      answers: [
        'When the new leaf went left then right, or right then left, under the unbalanced node',
        'When the tree has an even number of nodes',
        'Whenever the root is unbalanced',
      ],
      correct: 0,
      reason:
        'A zig-zag path cannot be fixed by one rotation, so the child is rotated first to straighten it.',
    },
    {
      question: 'Why does an AVL tree keep searches at O(log n)?',
      answers: [
        'Because the height never exceeds about 1.44 log n',
        'Because every level is completely full',
        'Because values are stored in sorted arrays',
      ],
      correct: 0,
      reason:
        'Balances of at most 1 at every node bound the height logarithmically, even though levels need not be full.',
    },
  ],
  prepare(r) {
    r.nodes = [];
    r.a = [];
  },
  run(r) {
    let root = null;
    let sub = {};
    const sync = () => {
      const flat = flatten(root);
      r.nodes = flat.nodes;
      sub = flat.sub;
    };
    const idOf = value => r.nodes.findIndex(n => n.value === value);
    const extra = more => ({ sub: { ...sub }, ...more });

    for (const v of r.input) {
      if (!root) {
        root = { value: v, left: null, right: null, height: 1 };
        r.a.push(v);
        sync();
        r.emit(`Plant ${v} as the root of the Canopy Citadel.`, 1, [0], extra());
        continue;
      }
      // Walk down and attach.
      const path = [];
      let cur = root,
        duplicate = false;
      while (true) {
        r.compare();
        const id = idOf(cur.value);
        r.emit(
          `Compare ${v} with ${cur.value}.`,
          1,
          [id],
          extra({
            incoming: v,
            ask: ask(
              'choice',
              `${v} versus ${cur.value}: which way?`,
              v < cur.value ? 0 : v > cur.value ? 1 : 2,
              ['Go left', 'Go right', 'Duplicate, skip']
            ),
          })
        );
        if (v === cur.value) {
          r.emit(`${v} is already planted. Duplicates are skipped.`, 1, [id], extra());
          duplicate = true;
          break;
        }
        const side = v < cur.value ? 'left' : 'right';
        path.push(cur);
        if (!cur[side]) {
          cur[side] = { value: v, left: null, right: null, height: 1 };
          r.a.push(v);
          r.move();
          sync();
          r.emit(
            `The ${side} branch of ${cur.value} is empty. Attach ${v} as a new leaf.`,
            1,
            [idOf(v)],
            extra({ activeEdge: [idOf(cur.value), idOf(v)] })
          );
          break;
        }
        r.emit(`Follow the ${side} branch.`, 1, [id], extra({ activeEdge: [id, idOf(cur[side].value)] }));
        cur = cur[side];
      }
      if (duplicate) continue;

      // Walk back up, updating heights and rotating where needed. The attach frame gets the
      // prediction ask once the outcome is known.
      const attachFrame = r.frames.at(-1);
      let outcome = 0; // 0 balanced, 1 single rotation, 2 double rotation
      for (let i = path.length - 1; i >= 0; i--) {
        const z = path[i];
        refresh(z);
        const b = balance(z);
        sync();
        r.emit(`Update ${z.value}: height ${z.height}, balance ${fmt(b)}.`, 3, [idOf(z.value)], extra());
        if (Math.abs(b) <= 1) continue;
        r.emit(
          `Imbalance at ${z.value}: balance ${fmt(b)} is outside -1 to +1.`,
          4,
          [idOf(z.value)],
          extra()
        );
        let replacement;
        if (b > 1) {
          const y = z.left;
          if (v < y.value) {
            outcome = 1;
            r.emit(
              `LL case: the new leaf is under the left child ${y.value}, on its left. Right rotation at ${z.value}.`,
              5,
              [idOf(z.value), idOf(y.value)],
              extra({ activeEdge: [idOf(z.value), idOf(y.value)] })
            );
            replacement = rotateRight(z);
          } else {
            outcome = 2;
            r.emit(
              `LR case: the new leaf is under the left child ${y.value}, on its right. First a left rotation at ${y.value}.`,
              6,
              [idOf(y.value), idOf(y.right.value)],
              extra({ activeEdge: [idOf(y.value), idOf(y.right.value)] })
            );
            z.left = rotateLeft(y);
            sync();
            r.emit(
              `Left rotation done at ${y.value}. Now a right rotation at ${z.value}.`,
              6,
              [idOf(z.value), idOf(z.left.value)],
              extra({ activeEdge: [idOf(z.value), idOf(z.left.value)] })
            );
            replacement = rotateRight(z);
          }
        } else {
          const y = z.right;
          if (v > y.value) {
            outcome = 1;
            r.emit(
              `RR case: the new leaf is under the right child ${y.value}, on its right. Left rotation at ${z.value}.`,
              7,
              [idOf(z.value), idOf(y.value)],
              extra({ activeEdge: [idOf(z.value), idOf(y.value)] })
            );
            replacement = rotateLeft(z);
          } else {
            outcome = 2;
            r.emit(
              `RL case: the new leaf is under the right child ${y.value}, on its left. First a right rotation at ${y.value}.`,
              8,
              [idOf(y.value), idOf(y.left.value)],
              extra({ activeEdge: [idOf(y.value), idOf(y.left.value)] })
            );
            z.right = rotateRight(y);
            sync();
            r.emit(
              `Right rotation done at ${y.value}. Now a left rotation at ${z.value}.`,
              8,
              [idOf(z.value), idOf(z.right.value)],
              extra({ activeEdge: [idOf(z.value), idOf(z.right.value)] })
            );
            replacement = rotateLeft(z);
          }
        }
        r.move();
        if (i === 0) root = replacement;
        else {
          const p = path[i - 1];
          if (p.left === z) p.left = replacement;
          else p.right = replacement;
        }
        sync();
        r.emit(
          `Rebalanced. ${replacement.value} now roots this branch, with ${z.value} below it.`,
          9,
          [idOf(replacement.value)],
          extra()
        );
      }
      attachFrame.ask = ask('choice', `${v} is attached. What happens on the way back up?`, outcome, [
        'Balanced, no rotation',
        'Single rotation',
        'Double rotation',
      ]);
      if (outcome === 0)
        r.emit(`Every balance on the path stays within -1 to +1. No rotation needed.`, 4, [], extra());
    }
    if (!root) {
      r.emit('No values to plant. The citadel stays empty.', 9);
      return;
    }
    r.marked = r.nodes.map(n => n.id);
    r.emit(`AVL tree complete: height ${root.height}, every balance within -1 to +1.`, 9, [], extra());
  },
  check(input, last) {
    const nodes = last.nodes;
    const expected = [...new Set(input)].sort((x, y) => x - y);
    if (!nodes.length) return expected.length === 0;
    const order = [];
    let ok = true;
    const walk = id => {
      if (id === null || id === undefined) return 0;
      const n = nodes[id];
      if (!n) {
        ok = false;
        return 0;
      }
      const hl = walk(n.left);
      order.push(n.value);
      const hr = walk(n.right);
      if (Math.abs(hl - hr) > 1) ok = false;
      return 1 + Math.max(hl, hr);
    };
    walk(0);
    return ok && order.length === nodes.length && JSON.stringify(order) === JSON.stringify(expected);
  },
};
