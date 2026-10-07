import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

// In-order values of a flat node list, starting at id 0.
function inorderOf(nodes) {
  const out = [];
  const walk = id => {
    if (id === null || id === undefined || !nodes[id]) return;
    walk(nodes[id].left);
    out.push(nodes[id].value);
    walk(nodes[id].right);
  };
  if (nodes.length) walk(0);
  return out;
}

export default {
  id: 'bstInsert',
  topic: 'tree',
  name: 'Insert into a BST',
  time: 'O(h)',
  space: 'O(1)',
  view: 'tree',
  target: true,
  sample: { input: [8, 4, 12, 2, 6, 10, 14], target: 5 },
  intro:
    'Walk down from the root as if searching for the new value. When the branch you need is empty, plant the new node there as a leaf.',
  insight:
    'A new value always becomes a leaf, so the in-order sequence stays sorted and the search path is at most the height h. Duplicates are ignored: a BST holds each value once.',
  code: [
    'insert(root, value):',
    '  node = root',
    '  loop',
    '    if value == node.value: return (duplicate, ignore)',
    '    side = left if value < node.value else right',
    '    if node[side] == null: node[side] = new Node(value); return',
    '    node = node[side]',
  ],
  quiz: [
    {
      question: 'Where does a newly inserted value always end up in a plain BST?',
      answers: ['At the root', 'As a new leaf', 'In the middle of a branch'],
      correct: 1,
      reason:
        'The walk only stops at an empty branch, and a node attached to an empty branch has no children.',
    },
    {
      question: 'What happens when you insert a value that is already in the tree?',
      answers: ['It is ignored', 'It becomes the new root', 'The old copy is deleted'],
      correct: 0,
      reason: 'A BST stores each value once, so a duplicate is detected on the walk and nothing is attached.',
    },
    {
      question: 'How many comparisons can an insertion take in the worst case?',
      answers: ['About the height of the tree', 'Exactly one', 'About the number of leaves'],
      correct: 0,
      reason: 'Each comparison moves one level down, so the walk is bounded by the height h.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes,
      value = r.target;
    if (!nodes.length) {
      nodes.push({ id: 0, value, left: null, right: null });
      r.a = [value];
      r.marked.push(0);
      r.emit(`The forest is empty, so ${value} becomes the root.`, 5, [0]);
      return;
    }
    let id = 0;
    while (true) {
      const n = nodes[id];
      r.compare();
      const side = value < n.value ? 'left' : 'right';
      const answer = value === n.value ? 3 : n[side] === null ? 2 : side === 'left' ? 0 : 1;
      r.emit(`Compare the sapling ${value} with node ${n.value}.`, 3, [id], {
        incoming: value,
        ask: ask('choice', `${value} versus ${n.value}: what happens?`, answer, [
          'Go left',
          'Go right',
          'Attach here',
          'Duplicate, ignore',
        ]),
      });
      if (value === n.value) {
        r.marked.push(id);
        r.emit(`${value} is already in the tree. Duplicates are ignored, so nothing changes.`, 3, [id]);
        return;
      }
      r.marked.push(id);
      if (n[side] === null) {
        const fresh = { id: nodes.length, value, left: null, right: null };
        n[side] = fresh.id;
        nodes.push(fresh);
        r.move();
        r.marked = [fresh.id];
        r.emit(`The ${side} branch of ${n.value} is empty. Plant ${value} there.`, 5, [fresh.id], {
          activeEdge: [id, fresh.id],
        });
        break;
      }
      r.emit(
        `${value} is ${side === 'left' ? 'smaller' : 'larger'}. Follow the ${side} branch to ${nodes[n[side]].value}.`,
        6,
        [id],
        { activeEdge: [id, n[side]], incoming: value }
      );
      id = n[side];
    }
    r.emit(`Inserted ${value} as a leaf. In-order still reads ${inorderOf(nodes).join(', ')}.`, 5, [
      nodes.length - 1,
    ]);
  },
  check(input, last, target) {
    const expected = [...new Set([...input, target])].sort((x, y) => x - y);
    return JSON.stringify(inorderOf(last.nodes)) === JSON.stringify(expected);
  },
};
