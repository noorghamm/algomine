import { ask } from './recorder.mjs';
import { graphEdges } from './shared.mjs';

export default {
  id: 'dfs',
  topic: 'graph',
  name: 'Depth-first search',
  time: 'O(V + E)',
  space: 'O(V)',
  intro:
    'Follow one path as far as possible, then backtrack. A stack remembers nodes still waiting to be explored.',
  insight:
    'DFS is useful for connectivity, cycles, and topological reasoning. Here, reverse-order pushes make smaller neighbors get visited first.',
  code: [
    'stack = [start]; visited = {}',
    'while stack is not empty',
    '  node = stack.pop()',
    '  if node in visited: continue',
    '  visit(node); visited.add(node)',
    '  push unvisited neighbors in reverse order',
    'return visit order',
  ],
  quiz: [
    {
      question: 'Which behavior describes DFS?',
      answers: [
        'Explore every immediate neighbor first',
        'Always select the shortest edge',
        'Explore deeply, then backtrack',
      ],
      correct: 2,
      reason:
        'DFS follows a branch until it runs out of unvisited neighbors, then returns to another branch.',
    },
    {
      question: 'Why can the same node appear on the stack more than once in this version?',
      answers: [
        'Nodes are marked when visited, not when pushed',
        'The graph has duplicate edges',
        'The stack is unbounded',
      ],
      correct: 0,
      reason: 'Two neighbors may push the same node before it is popped, so the visited check skips repeats.',
    },
    {
      question: 'Which task is DFS better suited to than BFS?',
      answers: [
        'Detecting cycles and ordering dependencies',
        'Finding the fewest-edge path',
        'Counting layers',
      ],
      correct: 0,
      reason: 'The deep, backtracking structure of DFS naturally exposes back edges and finish order.',
    },
  ],
  prepare(r) {
    r.a = [1, 2, 3, 4, 5, 6, 7];
  },
  run(r) {
    const neighbors = Array.from({ length: 7 }, () => []);
    for (const [u, v] of graphEdges) {
      neighbors[u].push(v);
      neighbors[v].push(u);
    }
    neighbors.forEach(n => n.sort((x, y) => x - y));
    const pending = [0],
      seen = new Set();
    r.aux = [1];
    r.emit('Start at node 1.', 0, [0]);
    while (pending.length) {
      const id = pending.pop();
      if (seen.has(id)) {
        r.aux = pending.map(i => i + 1);
        r.emit(`Node ${id + 1} was already visited. Skip it.`, 3, [id]);
        continue;
      }
      r.frames.at(-1).ask = ask('node', 'Which node is visited next?', id);
      seen.add(id);
      r.marked.push(id);
      r.output.push(id + 1);
      r.compare();
      r.aux = pending.map(i => i + 1);
      r.emit(`Visit node ${id + 1}.`, 4, [id]);
      for (const n of [...neighbors[id]].reverse()) {
        if (seen.has(n)) continue;
        pending.push(n);
        r.move();
        r.aux = pending.map(i => i + 1);
        r.emit(`Add node ${n + 1} to the stack.`, 5, [id, n], { activeEdge: [id, n] });
      }
    }
    r.aux = [];
    r.emit(`Exploration complete: ${r.output.join(' → ')}.`, 6);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify([1, 2, 4, 7, 5, 3, 6]);
  },
};
