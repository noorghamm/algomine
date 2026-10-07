import { ask } from './recorder.mjs';
import { graphEdges } from './shared.mjs';

export default {
  id: 'bfs',
  topic: 'graph',
  name: 'Breadth-first search',
  time: 'O(V + E)',
  space: 'O(V)',
  intro: 'Explore the graph one layer at a time. A queue holds discovered nodes while you visit their neighbors.',
  insight:
    'BFS finds shortest paths by edge count in an unweighted graph. This lesson starts at node 1 and checks neighbors in numeric order.',
  code: [
    'queue = [start]; discovered = {start}',
    'while queue is not empty',
    '  node = queue.dequeue(); visit(node)',
    '  for neighbor in neighbors(node)',
    '    if neighbor not in discovered',
    '      discover(neighbor); queue.enqueue(neighbor)',
    'return visit order',
  ],
  quiz: [
    {
      question: 'Which structure makes BFS explore one layer at a time?',
      answers: ['A stack', 'A queue', 'A max heap'],
      correct: 1,
      reason: 'The queue processes earlier discoveries before later ones, preserving distance layers.',
    },
    {
      question: 'What does BFS compute for free in an unweighted graph?',
      answers: ['Shortest paths by edge count from the start', 'A minimum spanning tree', 'A topological order'],
      correct: 0,
      reason: 'Nodes are reached in order of distance, so the first visit to a node uses the fewest edges.',
    },
    {
      question: 'Why mark a node as discovered when it is enqueued rather than when it is visited?',
      answers: ['To avoid enqueuing the same node twice', 'To visit it sooner', 'It makes no difference'],
      correct: 0,
      reason: 'Two neighbors might both see the node before it is dequeued; early marking keeps the queue clean.',
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
      seen = new Set([0]);
    r.aux = [1];
    r.emit('Start at node 1.', 0, [0]);
    while (pending.length) {
      r.frames.at(-1).ask = ask('node', 'Which node is visited next?', pending[0]);
      const id = pending.shift();
      r.marked.push(id);
      r.output.push(id + 1);
      r.compare();
      r.aux = pending.map(i => i + 1);
      r.emit(`Visit node ${id + 1}.`, 2, [id]);
      for (const n of neighbors[id]) {
        if (seen.has(n)) continue;
        seen.add(n);
        pending.push(n);
        r.move();
        r.aux = pending.map(i => i + 1);
        r.emit(`Add node ${n + 1} to the queue.`, 5, [id, n], { activeEdge: [id, n] });
      }
    }
    r.aux = [];
    r.emit(`Exploration complete: ${r.output.join(' → ')}.`, 6);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]);
  },
};
