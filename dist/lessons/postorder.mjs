import { ask } from './recorder.mjs';
import { makeTree } from './shared.mjs';

// Post-order of a flat node list, starting at id 0. Used by check() as the independent answer.
function postorderOf(nodes) {
  const out = [];
  const walk = id => {
    if (id === null || id === undefined || !nodes[id]) return;
    walk(nodes[id].left);
    walk(nodes[id].right);
    out.push(nodes[id].value);
  };
  if (nodes.length) walk(0);
  return out;
}

export default {
  id: 'postorder',
  topic: 'tree',
  name: 'Post-order traversal',
  time: 'O(n)',
  space: 'O(h)',
  view: 'tree',
  intro:
    'Finish the left subtree, then the right subtree, and only then output the node itself. The root of the Binary Forest is the last value out.',
  insight:
    'Post-order is how you free or delete a tree safely: every child is handled before its parent, so no node is removed while something below it still needs it. The call stack grows to the height h.',
  code: [
    'postorder(node):',
    '  if node == null: return',
    '  postorder(node.left)',
    '  postorder(node.right)',
    '  output.append(node.value)',
    'return output',
  ],
  quiz: [
    {
      question: 'Which node does a post-order traversal output last?',
      answers: ['The rightmost leaf', 'The root', 'The leftmost leaf'],
      correct: 1,
      reason:
        'A node is output only after both of its subtrees are done, so the root waits until the very end.',
    },
    {
      question: 'Why is post-order the safe order for deleting every node of a tree?',
      answers: [
        'Children are freed before their parent, so no freed node is still referenced',
        'It visits the fewest nodes',
        'It outputs the values in ascending order',
      ],
      correct: 0,
      reason:
        'Freeing a parent first would lose the links to its children, so post-order frees the children first.',
    },
    {
      question: 'For a single leaf node, what does post-order output?',
      answers: ['Nothing', 'The leaf value, once', 'The leaf value, twice'],
      correct: 1,
      reason: 'Both empty subtrees return immediately, then the leaf itself is output once.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes;
    const values = nodes.map(n => n.value);
    // Three choice options containing the correct value, sorted so the layout gives nothing away.
    const options = (correct, prefer) => {
      const picks = [correct];
      for (const v of [...prefer, ...values]) if (picks.length < 3 && !picks.includes(v)) picks.push(v);
      // Small trees may not have three distinct values, so pad with nearby distractors.
      for (let d = 1; picks.length < 3; d++) if (!picks.includes(correct + d)) picks.push(correct + d);
      picks.sort((x, y) => x - y);
      return { options: picks.map(String), answer: picks.indexOf(correct) };
    };
    const visit = (id, parent) => {
      const n = nodes[id];
      const nearby = [
        parent === null ? null : nodes[parent].value,
        n.left === null ? null : nodes[n.left].value,
      ].filter(v => v !== null);
      const o = options(n.value, nearby);
      const question = ask(
        'choice',
        `Below ${n.value} is finished. What is output next?`,
        o.answer,
        o.options
      );
      if (n.left === null && n.right === null) {
        r.emit(`Enter ${n.value}. It is a leaf, so both empty branches return at once.`, 2, [id], {
          ask: question,
        });
      } else {
        if (n.left !== null) {
          r.emit(`Enter ${n.value}. Nothing is output yet. Explore the left subtree.`, 2, [id], {
            activeEdge: [id, n.left],
          });
          visit(n.left, id);
        } else r.emit(`Enter ${n.value}. No left branch.`, 2, [id]);
        if (n.right !== null) {
          r.emit(`Back at ${n.value}. Explore the right subtree.`, 3, [id], {
            activeEdge: [id, n.right],
            ask: ask('node', 'Which node is visited next?', n.right),
          });
          visit(n.right, id);
        } else r.emit(`${n.value} has no right branch.`, 3, [id]);
        r.emit(`Both branches of ${n.value} are done.`, 3, [id], { ask: question });
      }
      r.marked.push(id);
      r.output.push(n.value);
      r.compare();
      r.emit(`Output ${n.value}. Output: ${r.output.join(', ')}.`, 4, [id]);
    };
    if (nodes.length) visit(0, null);
    else r.emit('The forest is empty, so there is nothing to output.', 1);
    r.emit(`Traversal complete. Post-order: ${r.output.join(', ')}. The root came out last.`, 5);
  },
  check(input, last) {
    const expected = postorderOf(makeTree([...new Set(input)]));
    return JSON.stringify(last.output) === JSON.stringify(expected);
  },
};
