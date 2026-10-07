import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

export default {
  id: 'inorder',
  topic: 'tree',
  name: 'In-order traversal',
  time: 'O(n)',
  space: 'O(h)',
  intro:
    'Visit the left subtree, then the node, then the right subtree. A binary search tree reveals its values in ascending order.',
  insight: 'The traversal visits each node once. Its recursive call stack can grow to the tree height h.',
  code: [
    'inorder(node):',
    '  if node == null: return',
    '  inorder(node.left)',
    '  output.append(node.value)',
    '  inorder(node.right)',
    'return output',
  ],
  quiz: [
    {
      question: 'What order does in-order traversal produce for a BST?',
      answers: ['Descending order', 'Insertion order', 'Ascending order'],
      correct: 2,
      reason: 'Left values are smaller and right values are larger, so left, node, right produces ascending order.',
    },
    {
      question: 'Which node is output first by an in-order traversal?',
      answers: ['The leftmost node', 'The root', 'The rightmost node'],
      correct: 0,
      reason: 'The traversal keeps going left before outputting anything, so the leftmost node comes first.',
    },
    {
      question: 'How much extra space does recursive in-order traversal use?',
      answers: ['O(h) for the call stack', 'O(1)', 'O(n²)'],
      correct: 0,
      reason: 'Each pending recursive call sits on the stack, and the deepest chain is the tree height.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes;
    const visit = id => {
      if (id === null) return;
      const n = nodes[id];
      r.emit(`Explore the left subtree of ${n.value}.`, 2, [id], {
        ask: ask(
          'choice',
          `Left of ${n.value}: what happens next?`,
          n.left === null ? 1 : 0,
          [`Go down to ${n.left === null ? 'a child' : nodes[n.left].value}`, `Nothing there, so output ${n.value}`]
        ),
      });
      visit(n.left);
      r.marked.push(id);
      r.output.push(n.value);
      r.compare();
      r.emit(`Visit ${n.value}. Output: ${r.output.join(', ')}.`, 3, [id]);
      r.emit(`Explore the right subtree of ${n.value}.`, 4, [id]);
      visit(n.right);
    };
    if (nodes.length) visit(0);
    r.emit('Traversal complete. The values are in ascending order.', 5);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify([...new Set(input)].sort((x, y) => x - y));
  },
};
