import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

export default {
  id: 'bst',
  topic: 'tree',
  name: 'Search a BST',
  time: 'O(h)',
  space: 'O(1)',
  target: true,
  intro:
    'Compare your target with the current node. Follow the left branch for a smaller value or the right branch for a larger one.',
  insight:
    'h is the tree height. A balanced BST has O(log n) height; a skewed BST can have O(n) height. Duplicate input values are omitted.',
  code: [
    'node = root',
    'while node != null',
    '  compare target and node.value',
    '  if target == node.value: return node',
    '  if target < node.value: node = node.left',
    '  else: node = node.right',
    'return not found',
  ],
  quiz: [
    {
      question: 'At a node with value 8, where should you look for 6?',
      answers: ['In the right subtree', 'In the left subtree', 'At the parent'],
      correct: 1,
      reason: 'A BST stores smaller values in the left subtree and larger values in the right.',
    },
    {
      question: 'Inserting sorted values 1, 2, 3, 4, 5 into an empty BST gives what shape?',
      answers: ['A chain leaning right, height n', 'A perfectly balanced tree', 'A chain leaning left'],
      correct: 0,
      reason: 'Each new value is larger than everything before it, so it always becomes the rightmost child.',
    },
    {
      question: 'What bounds the number of comparisons in a BST search?',
      answers: ['The height of the tree', 'The number of leaves', 'The sum of the values'],
      correct: 0,
      reason: 'Each comparison moves one level down, so a search never exceeds the height.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes,
      target = r.target;
    let id = nodes.length ? 0 : null,
      found = false;
    while (id !== null) {
      const n = nodes[id];
      r.compare();
      r.emit(`Compare target ${target} with node ${n.value}.`, 2, [id], {
        ask: ask(
          'choice',
          `${target} versus ${n.value}: which way?`,
          target === n.value ? 2 : target < n.value ? 0 : 1,
          ['Go left', 'Go right', 'Found it']
        ),
      });
      if (n.value === target) {
        r.marked.push(id);
        r.emit(`Found ${target} in the tree.`, 3, [id]);
        found = true;
        break;
      }
      r.marked.push(id);
      const next = target < n.value ? n.left : n.right;
      r.emit(
        `${target} is ${target < n.value ? 'smaller' : 'larger'}. Follow the ${target < n.value ? 'left' : 'right'} branch.`,
        target < n.value ? 4 : 5,
        [id],
        { activeEdge: [id, next] }
      );
      id = next;
    }
    if (!found) r.emit(`Reached an empty branch. ${target} is not in the tree.`, 6);
  },
  check(input, last, target) {
    return last.message.startsWith('Found') === input.includes(target);
  },
};
