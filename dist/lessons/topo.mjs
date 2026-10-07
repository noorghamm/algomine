import { ask } from './recorder.mjs';
import { directedEdges } from './shared.mjs';

const label = id => id + 1;

export default {
  id: 'topo',
  topic: 'graph',
  name: 'Topological sort',
  time: 'O(V + E)',
  space: 'O(V)',
  view: 'graph',
  inputKind: 'fixed',
  sample: { input: [1, 2, 3, 4, 5, 6, 7] },
  intro:
    "The rails now run one way. Kahn's algorithm lines the stations up so that every edge points forward: repeatedly remove a node that nothing still points to.",
  insight:
    'A node is ready when its in-degree is 0, meaning all its prerequisites are already in the order. If the ready set empties before every node is placed, the graph has a cycle and no order exists.',
  code: [
    'indeg[v] = number of edges into v, for every v',
    'ready = all v with indeg[v] == 0',
    'while ready is not empty',
    '  v = ready.removeSmallest(); order.append(v)',
    '  for each edge v → w',
    '    indeg[w] −= 1',
    '    if indeg[w] == 0: ready.add(w)',
    'return order',
  ],
  quiz: [
    {
      question: 'When is a node ready to be placed in the order?',
      answers: ['When its in-degree is 0', 'When its out-degree is 0', 'When it has the smallest number'],
      correct: 0,
      reason:
        'In-degree 0 means every edge into the node has already been removed, so all its prerequisites are placed.',
    },
    {
      question: 'What does it mean if the ready set empties with nodes still unplaced?',
      answers: ['The graph is disconnected', 'The graph contains a cycle', 'The graph is a tree'],
      correct: 1,
      reason:
        "Nodes left on a cycle keep each other's in-degree above zero, so none of them ever becomes ready.",
    },
    {
      question: 'What makes a sequence a valid topological order?',
      answers: [
        'Nodes appear in increasing number',
        'Every edge goes from an earlier node to a later node',
        'It visits every edge once',
      ],
      correct: 1,
      reason: 'The order is valid exactly when no edge points backwards, whatever the node numbers are.',
    },
  ],
  prepare(r) {
    r.a = [1, 2, 3, 4, 5, 6, 7];
  },
  run(r) {
    const indeg = Array(7).fill(0);
    for (const [, to] of directedEdges) indeg[to]++;
    const original = [...indeg];
    const removed = new Set();
    const gone = new Set();
    const ready = () => [...Array(7).keys()].filter(i => !removed.has(i) && indeg[i] === 0);

    const frame = (message, line, active, activeEdge = -1) => {
      const sub = Object.fromEntries(indeg.map((d, i) => [i, String(d)]));
      const edges = directedEdges.map(([from, to], idx) => {
        let state = 'idle';
        if (idx === activeEdge) state = 'active';
        else if (gone.has(idx)) state = 'rejected';
        return { from, to, directed: true, state };
      });
      const trays = [{ label: 'READY', values: ready().map(label) }];
      r.emit(message, line, active, { edges, sub, trays });
    };

    frame('Count the edges coming into each node. That is its in-degree.', 0, []);
    frame(
      `Ready set: nodes with in-degree 0. Right now that is node ${ready().map(label).join(', ')}.`,
      1,
      ready()
    );
    while (ready().length) {
      const list = ready();
      const u = list[0];
      if (list.length > 1)
        r.frames.at(-1).ask = ask('node', 'Which ready node is removed next? Lowest number first.', u);
      removed.add(u);
      r.marked.push(u);
      r.output.push(label(u));
      r.move();
      frame(`Remove node ${label(u)} and append it to the order.`, 3, [u]);
      directedEdges.forEach(([from, to], idx) => {
        if (from !== u) return;
        r.compare();
        frame(`Edge ${label(from)} → ${label(to)} leaves with node ${label(from)}.`, 4, [from, to], idx);
        if (original[to] >= 2)
          r.frames.at(-1).ask = ask(
            'choice',
            `What does the in-degree of node ${label(to)} become?`,
            indeg[to] - 1,
            ['0', '1', '2']
          );
        indeg[to]--;
        gone.add(idx);
        if (indeg[to] === 0) frame(`Node ${label(to)} has in-degree 0 now. It is ready.`, 6, [to]);
        else
          frame(`Node ${label(to)} still waits on ${indeg[to]} more edge${indeg[to] > 1 ? 's' : ''}.`, 5, [
            to,
          ]);
      });
    }
    frame(`Topological order: ${r.output.join(' → ')}.`, 7, []);
  },
  check(input, last) {
    const order = last.output;
    if (order.length !== 7 || new Set(order).size !== 7) return false;
    const pos = new Map(order.map((v, i) => [v - 1, i]));
    return directedEdges.every(([from, to]) => pos.get(from) < pos.get(to));
  },
};
