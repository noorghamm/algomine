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

// Rebuild a flat node list from `rootId` with pre-order numbering, so the root becomes id 0.
// Nodes that are no longer reachable from the root are dropped.
function renumber(nodes, rootId) {
  const out = [];
  const walk = id => {
    if (id === null) return null;
    const n = nodes[id];
    const fresh = { id: out.length, value: n.value, left: null, right: null };
    out.push(fresh);
    fresh.left = walk(n.left);
    fresh.right = walk(n.right);
    return fresh.id;
  };
  walk(rootId);
  return out;
}

export default {
  id: 'bstDelete',
  topic: 'tree',
  name: 'Delete from a BST',
  time: 'O(h)',
  space: 'O(1)',
  view: 'tree',
  target: true,
  sample: { input: [8, 4, 12, 2, 6, 10, 14], target: 4 },
  intro:
    'Find the node, then handle one of three cases: a leaf is snipped off, a node with one child is replaced by that child, and a node with two children takes the value of its in-order successor.',
  insight:
    'The in-order successor is the smallest value in the right subtree, so copying it up keeps the in-order sequence sorted. That successor has no left child, so removing it is always a leaf or one-child case.',
  code: [
    'delete(root, value):',
    '  find the node with value, remembering its parent',
    '  if not found: return',
    '  if node is a leaf: unlink it from its parent',
    '  else if node has one child: link the parent to that child',
    '  else: s = leftmost node of node.right',
    '    node.value = s.value',
    '    unlink s (it has no left child)',
  ],
  quiz: [
    {
      question: 'Deleting a node with two children replaces its value with what?',
      answers: [
        'The largest value in its left subtree or the smallest in its right',
        'Its parent',
        'The root',
      ],
      correct: 0,
      reason: 'Either neighbour in sorted order keeps every left value smaller and every right value larger.',
    },
    {
      question: 'Why can the in-order successor always be unlinked easily?',
      answers: ['It is always the root', 'It never has a left child', 'It is always a leaf'],
      correct: 1,
      reason: 'The successor is the leftmost node of the right subtree, so there is nothing to its left.',
    },
    {
      question: 'What happens when the value to delete is not in the tree?',
      answers: ['The root is deleted instead', 'The nearest value is deleted', 'Nothing changes'],
      correct: 2,
      reason: 'The search reaches an empty branch, and there is no node to unlink.',
    },
  ],
  prepare(r) {
    r.nodes = makeTree(r.a);
  },
  run(r) {
    const nodes = r.nodes,
      value = r.target;
    if (!nodes.length) {
      r.emit('The forest is empty. There is nothing to delete.', 2);
      return;
    }
    // Search, remembering the parent.
    let id = 0,
      parent = null;
    while (id !== null) {
      const n = nodes[id];
      r.compare();
      r.emit(`Compare ${value} with node ${n.value}.`, 1, [id], {
        ask: ask(
          'choice',
          `${value} versus ${n.value}: which way?`,
          value === n.value ? 2 : value < n.value ? 0 : 1,
          ['Go left', 'Go right', 'Found it']
        ),
      });
      if (n.value === value) break;
      const side = value < n.value ? 'left' : 'right';
      r.marked.push(id);
      if (n[side] === null) {
        r.emit(
          `The ${side} branch of ${n.value} is empty. ${value} is not in the tree, so nothing changes.`,
          2,
          [id]
        );
        return;
      }
      r.emit(`${value} is ${side === 'left' ? 'smaller' : 'larger'}. Follow the ${side} branch.`, 1, [id], {
        activeEdge: [id, n[side]],
      });
      parent = id;
      id = n[side];
    }
    const n = nodes[id];
    const children = [n.left, n.right].filter(c => c !== null);
    r.emit(`Found ${value}. Count its children to pick the case.`, 1, [id], {
      ask: ask('choice', `Which case applies to ${value}?`, children.length, [
        'Leaf',
        'One child',
        'Two children',
      ]),
    });
    // Point the parent (or the root slot) at `child`, then renumber so the root is id 0.
    const relink = child => {
      let rootId = 0;
      if (parent === null) rootId = child;
      else nodes[parent][nodes[parent].left === id ? 'left' : 'right'] = child;
      r.move();
      r.nodes = renumber(nodes, rootId);
      r.marked = [];
      if (!r.nodes.length) r.a = [];
    };
    if (children.length === 0) {
      r.emit(
        `${value} is a leaf. Snip it off.`,
        3,
        [id],
        parent === null ? {} : { activeEdge: [parent, id] }
      );
      relink(null);
      if (!r.nodes.length) r.emit('The only node is gone. The forest is empty.', 3);
      else
        r.emit(`${value} removed. In-order: ${inorderOf(r.nodes).join(', ')}.`, 3, [
          r.nodes.findIndex(m => m.value === nodes[parent].value),
        ]);
      return;
    }
    if (children.length === 1) {
      const child = children[0],
        childValue = nodes[child].value;
      r.emit(`${value} has one child, ${childValue}. Lift that child into its place.`, 4, [id, child], {
        activeEdge: [id, child],
      });
      relink(child);
      r.emit(`${childValue} takes the spot of ${value}. In-order: ${inorderOf(r.nodes).join(', ')}.`, 4, [
        r.nodes.findIndex(m => m.value === childValue),
      ]);
      return;
    }
    // Two children: find the in-order successor, the leftmost node of the right subtree.
    let s = n.right,
      sParent = id;
    while (nodes[s].left !== null) {
      sParent = s;
      s = nodes[s].left;
    }
    r.emit(`${value} has two children. Its successor is the smallest value in the right subtree.`, 5, [id], {
      activeEdge: [id, n.right],
      ask: ask('node', `Which node is the in-order successor of ${value}?`, s),
    });
    let cur = n.right;
    r.emit(`Step right to ${nodes[cur].value}, then keep left as far as possible.`, 5, [cur], {
      activeEdge: [id, cur],
    });
    while (nodes[cur].left !== null) {
      r.emit(`Step left to ${nodes[nodes[cur].left].value}.`, 5, [nodes[cur].left], {
        activeEdge: [cur, nodes[cur].left],
      });
      cur = nodes[cur].left;
    }
    r.marked.push(s);
    r.emit(`${nodes[s].value} has no left child, so it is the successor.`, 5, [s]);
    const old = n.value;
    n.value = nodes[s].value;
    r.move();
    r.emit(`Copy ${n.value} up into the spot of ${old}.`, 6, [id, s], { activeEdge: [id, s] });
    // Unlink the successor: it has at most a right child.
    nodes[sParent][nodes[sParent].left === s ? 'left' : 'right'] = nodes[s].right;
    r.move();
    r.nodes = renumber(nodes, 0);
    r.marked = [];
    r.emit(
      `Unlink the old ${n.value} from the right subtree. In-order: ${inorderOf(r.nodes).join(', ')}.`,
      7,
      [r.nodes.findIndex(m => m.value === n.value)]
    );
  },
  check(input, last, target) {
    const expected = [...new Set(input)].filter(v => v !== target).sort((x, y) => x - y);
    return JSON.stringify(inorderOf(last.nodes)) === JSON.stringify(expected);
  },
};
