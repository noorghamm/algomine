import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

// Pre-order of a flat node list, starting at id 0. Used by check() as the independent answer.
function preorderOf(nodes) {
  const out = [];
  const walk = id => {
    if (id === null || id === undefined || !nodes[id]) return;
    out.push(nodes[id].value);
    walk(nodes[id].left);
    walk(nodes[id].right);
  };
  if (nodes.length) walk(0);
  return out;
}

export default {
  id: 'preorder',
  topic: 'tree',
  name: 'Pre-order traversal',
  time: 'O(n)',
  space: 'O(h)',
  view: 'tree',
  intro:
    'Output the node first, then its left subtree, then its right subtree. The root of the Binary Forest is always the first value out.',
  insight:
    'Pre-order lists a tree in the order you would rebuild it: insert the values back into an empty BST in this order and you get the same shape. The call stack grows to the height h.',
  code: [
    'preorder(node):',
    '  if node == null: return',
    '  output.append(node.value)',
    '  preorder(node.left)',
    '  preorder(node.right)',
    'return output',
  ],
  quiz: [
    {
      question: 'Which node does a pre-order traversal output first?',
      answers: ['The root', 'The leftmost node', 'The rightmost node'],
      correct: 0,
      reason: 'Pre-order outputs a node before looking at either subtree, so the root comes out first.',
    },
    {
      question: 'After outputting a node, where does pre-order go next?',
      answers: ['Its right subtree', 'Its left subtree', 'Its parent'],
      correct: 1,
      reason: 'The order is node, left, right, so the left subtree is explored before the right one.',
    },
    {
      question: 'Why is pre-order a good way to save a BST to a file?',
      answers: [
        'Reinserting the values in that order rebuilds the same shape',
        'It writes the values in ascending order',
        'It skips the leaves to save space',
      ],
      correct: 0,
      reason:
        'Each parent is listed before its children, so inserting in that order recreates the same parent and child links.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes;
    const values = nodes.map(n => n.value);
    // Three choice options containing the correct value, sorted so the layout gives nothing away.
    const options = correct => {
      const picks = [correct];
      for (const v of values) if (picks.length < 3 && !picks.includes(v)) picks.push(v);
      // Small trees may not have three distinct values, so pad with nearby distractors.
      for (let d = 1; picks.length < 3; d++) if (!picks.includes(correct + d)) picks.push(correct + d);
      picks.sort((x, y) => x - y);
      return { options: picks.map(String), answer: picks.indexOf(correct) };
    };
    const visit = id => {
      const n = nodes[id];
      r.marked.push(id);
      r.output.push(n.value);
      r.compare();
      r.emit(`Visit ${n.value} and output it right away. Output: ${r.output.join(', ')}.`, 2, [id]);
      if (n.left !== null) {
        const o = options(nodes[n.left].value);
        r.emit(`Explore the left subtree of ${n.value}.`, 3, [id], {
          activeEdge: [id, n.left],
          ask: ask('choice', `After ${n.value}, what is output next?`, o.answer, o.options),
        });
        visit(n.left);
        if (n.right !== null)
          r.emit(`Back at ${n.value}. Explore the right subtree.`, 4, [id], {
            activeEdge: [id, n.right],
            ask: ask('node', 'Which node is visited next?', n.right),
          });
        else r.emit(`Back at ${n.value}. No right branch, so climb back up.`, 4, [id]);
      } else if (n.right !== null) {
        r.emit(`${n.value} has no left branch. Explore the right subtree.`, 4, [id], {
          activeEdge: [id, n.right],
          ask: ask('node', 'Which node is visited next?', n.right),
        });
      } else {
        r.emit(`${n.value} is a leaf. Climb back up.`, 4, [id]);
        return;
      }
      if (n.right !== null) visit(n.right);
    };
    if (nodes.length) visit(0);
    else r.emit('The forest is empty, so there is nothing to output.', 1);
    r.emit(`Traversal complete. Pre-order: ${r.output.join(', ')}.`, 5);
  },
  check(input, last) {
    const expected = preorderOf(makeTree([...new Set(input)]));
    return JSON.stringify(last.output) === JSON.stringify(expected);
  },
};
