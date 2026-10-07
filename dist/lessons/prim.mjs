import { ask } from './recorder.mjs';
import { weightedEdges } from './shared.mjs';

const INF = Infinity;
const label = id => id + 1;
const key = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);
const fmt = c => (c === INF ? '∞' : String(c));
const edgeLabel = ([u, v, w]) => `${label(u)}–${label(v)} (${w})`;

// Kruskal with union-find, used by check() as an independent answer for the spanning tree weight.
function kruskalWeight(edges, n = 7) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  let total = 0;
  for (const [u, v, w] of [...edges].sort((x, y) => x[2] - y[2])) {
    const a = find(u),
      b = find(v);
    if (a === b) continue;
    parent[a] = b;
    total += w;
  }
  return total;
}

function connected(edges, n = 7) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const { from, to } of edges) parent[find(from)] = find(to);
  return new Set(parent.map((_, i) => find(i))).size === 1;
}

export default {
  id: 'prim',
  topic: 'graph',
  name: 'Prim minimum spanning tree',
  time: 'O(E log V)',
  space: 'O(V)',
  view: 'graph',
  inputKind: 'fixed',
  sample: { input: [1, 2, 3, 4, 5, 6, 7] },
  intro:
    'Connect every station in Pathfinder Valley with the least rail. Grow one tree from node 1, always adding the cheapest edge that crosses from the tree to the outside.',
  insight:
    'The cut property makes this safe: the cheapest edge crossing any cut belongs to some minimum spanning tree. Prim never has to undo a choice, and edges inside the tree are simply dropped.',
  code: [
    'tree = {start}; cost[start] = 0; cost[others] = ∞',
    'while tree has fewer than V nodes',
    '  look at every edge crossing the cut',
    '  pick the cheapest crossing edge (u, v)',
    '  add v and edge (u, v) to the tree',
    '  for each edge (v, w) with w outside: cost[w] = min(cost[w], weight)',
    'return tree',
  ],
  quiz: [
    {
      question: 'Which edge does Prim add at each step?',
      answers: [
        'The cheapest edge with exactly one endpoint in the tree',
        'The cheapest edge anywhere in the graph',
        'The edge that reaches the farthest node',
      ],
      correct: 0,
      reason:
        'Only edges crossing the cut can grow the tree, and the cheapest of them is always safe to take.',
    },
    {
      question: 'How many edges does a spanning tree of 7 nodes have?',
      answers: ['7', '6', '21'],
      correct: 1,
      reason: 'A tree on V nodes always has V minus 1 edges, so 7 nodes need exactly 6 edges.',
    },
    {
      question: 'Why is an edge between two nodes already in the tree rejected?',
      answers: ['It would create a cycle', 'Its weight is always the largest', 'It points the wrong way'],
      correct: 0,
      reason: 'Both endpoints are already connected through the tree, so adding the edge closes a loop.',
    },
  ],
  prepare(r) {
    r.a = [1, 2, 3, 4, 5, 6, 7];
  },
  run(r) {
    const inTree = new Set([0]);
    const cost = Array(7).fill(INF);
    cost[0] = 0;
    const chosen = [];
    const chosenKeys = new Set();
    r.marked.push(0);

    const frame = (message, line, active, candidates = []) => {
      const sub = Object.fromEntries(cost.map((c, i) => [i, fmt(c)]));
      const candidateKeys = new Set(candidates.map(([u, v]) => key(u, v)));
      const edges = weightedEdges.map(([from, to, weight]) => {
        const k = key(from, to);
        let state = 'idle';
        if (chosenKeys.has(k)) state = 'tree';
        else if (candidateKeys.has(k)) state = 'active';
        else if (inTree.has(from) && inTree.has(to)) state = 'rejected';
        return { from, to, weight, directed: false, state };
      });
      const trays = [{ label: 'TREE EDGES', values: chosen.map(edgeLabel) }];
      r.emit(message, line, active, { edges, sub, trays });
    };

    // Record what the newest tree node offers to its outside neighbours.
    const offer = node => {
      for (const [a, b, w] of weightedEdges) {
        const other = a === node ? b : b === node ? a : -1;
        if (other < 0 || inTree.has(other)) continue;
        r.compare();
        if (w < cost[other]) {
          cost[other] = w;
          r.move();
          frame(`Node ${label(other)} can join for ${w} via node ${label(node)}.`, 5, [node, other]);
        } else {
          frame(`Node ${label(other)} already has a cheaper offer of ${cost[other]}. Keep it.`, 5, [
            node,
            other,
          ]);
        }
      }
    };

    frame('Start the tree at node 1. No other node has a known connection yet.', 0, [0]);
    offer(0);
    while (inTree.size < 7) {
      const candidates = weightedEdges.filter(([u, v]) => inTree.has(u) !== inTree.has(v));
      let best = candidates[0];
      for (const e of candidates) {
        r.compare();
        if (e[2] < best[2]) best = e;
      }
      frame(
        `Edges crossing the cut: ${candidates.map(edgeLabel).join(', ')}.`,
        2,
        candidates.map(([u, v]) => (inTree.has(u) ? v : u)),
        candidates
      );
      r.frames.at(-1).ask = ask(
        'choice',
        'Which crossing edge does Prim take?',
        candidates.indexOf(best),
        candidates.map(edgeLabel)
      );
      const [u, v] = best;
      const newNode = inTree.has(u) ? v : u;
      const oldNode = inTree.has(u) ? u : v;
      inTree.add(newNode);
      chosen.push(best);
      chosenKeys.add(key(u, v));
      r.marked.push(newNode);
      r.move();
      frame(`Take ${edgeLabel(best)}, the cheapest way across. Node ${label(newNode)} joins the tree.`, 4, [
        oldNode,
        newNode,
      ]);
      offer(newNode);
    }
    const total = chosen.reduce((s, e) => s + e[2], 0);
    frame(`Spanning tree complete: ${chosen.map(edgeLabel).join(', ')}. Total weight ${total}.`, 6, []);
  },
  check(input, last) {
    const tree = (last.edges || []).filter(e => e.state === 'tree');
    if (tree.length !== 6 || !connected(tree)) return false;
    return tree.reduce((s, e) => s + e.weight, 0) === kruskalWeight(weightedEdges);
  },
};
