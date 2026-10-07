import { ask } from './recorder.mjs';
import { weightedEdges } from './shared.mjs';

const INF = Infinity;
const label = id => id + 1;
const key = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);
const fmt = d => (d === INF ? '∞' : String(d));

// Independent reference solution used by check(): a plain O(V²) Dijkstra over the fixed map.
function shortestPaths(start = 0) {
  const dist = Array(7).fill(INF);
  dist[start] = 0;
  const done = new Set();
  while (done.size < 7) {
    let u = -1;
    for (let i = 0; i < 7; i++) if (!done.has(i) && (u < 0 || dist[i] < dist[u])) u = i;
    if (dist[u] === INF) break;
    done.add(u);
    for (const [a, b, w] of weightedEdges) {
      const v = a === u ? b : b === u ? a : -1;
      if (v >= 0 && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}

export default {
  id: 'dijkstra',
  topic: 'graph',
  name: 'Dijkstra shortest paths',
  time: 'O((V + E) log V)',
  space: 'O(V)',
  view: 'graph',
  inputKind: 'fixed',
  sample: { input: [1, 2, 3, 4, 5, 6, 7] },
  intro:
    'Find the cheapest rail route from node 1 to every other station in Pathfinder Valley. Always settle the closest unsettled node next, then relax its edges.',
  insight:
    'Once a node is settled its distance never changes, because every other route must pass through a node that is already at least as far away. This only holds when no edge has a negative weight.',
  code: [
    'dist[start] = 0; dist[others] = ∞; frontier = {start}',
    'while frontier is not empty',
    '  node = frontier.popMin(); settle(node)',
    '  for each edge (node, neighbor, w)',
    '    if neighbor is settled: skip',
    '    if dist[node] + w < dist[neighbor]',
    '      dist[neighbor] = dist[node] + w; parent[neighbor] = node',
    'return dist',
  ],
  quiz: [
    {
      question: 'Which node does Dijkstra settle next?',
      answers: [
        'The unsettled node with the smallest tentative distance',
        'The most recently discovered node',
        'The node with the fewest edges',
      ],
      correct: 0,
      reason:
        'Picking the closest node guarantees its tentative distance is already the true shortest distance.',
    },
    {
      question: 'What does relaxing an edge (u, v, w) mean?',
      answers: [
        'Removing the edge from the graph',
        'Checking whether dist[u] + w improves dist[v]',
        'Marking v as settled',
      ],
      correct: 1,
      reason: 'Relaxation lowers the tentative distance of v when the path through u is cheaper.',
    },
    {
      question: 'Why does Dijkstra fail with negative edge weights?',
      answers: [
        'The frontier overflows',
        'A settled node could later be reached more cheaply',
        'Distances become fractions',
      ],
      correct: 1,
      reason: 'A negative edge found later could undercut a distance that was already declared final.',
    },
  ],
  prepare(r) {
    r.a = [1, 2, 3, 4, 5, 6, 7];
  },
  run(r) {
    const dist = Array(7).fill(INF);
    const parent = Array(7).fill(null);
    const settled = new Set();
    const rejected = new Set();
    const frontier = new Set([0]);
    dist[0] = 0;
    const neighbors = Array.from({ length: 7 }, () => []);
    for (const [u, v, w] of weightedEdges) {
      neighbors[u].push([v, w]);
      neighbors[v].push([u, w]);
    }
    neighbors.forEach(n => n.sort((x, y) => x[0] - y[0]));
    const byDistance = () => [...frontier].sort((x, y) => dist[x] - dist[y] || x - y);

    const frame = (message, line, active, activeEdge) => {
      const sub = Object.fromEntries(dist.map((d, i) => [i, fmt(d)]));
      const edges = weightedEdges.map(([from, to, weight]) => {
        const k = key(from, to);
        let state = 'idle';
        if (activeEdge && key(...activeEdge) === k) state = 'active';
        else if (parent[to] === from || parent[from] === to) state = 'tree';
        else if (rejected.has(k)) state = 'rejected';
        return { from, to, weight, directed: false, state };
      });
      const trays = [{ label: 'FRONTIER', values: byDistance().map(i => `${label(i)} (${fmt(dist[i])})`) }];
      r.emit(message, line, active, { edges, sub, trays });
    };

    frame('Start at node 1 with distance 0. Every other node is ∞ for now.', 0, [0]);
    while (frontier.size) {
      const order = byDistance();
      const u = order[0];
      if (order.length > 1)
        r.frames.at(-1).ask = ask(
          'node',
          'Which frontier node is settled next? Ties go to the lower number.',
          u
        );
      frontier.delete(u);
      settled.add(u);
      r.marked.push(u);
      frame(`Settle node ${label(u)} at distance ${dist[u]}. That distance is final.`, 2, [u]);
      for (const [v, w] of neighbors[u]) {
        if (settled.has(v)) {
          rejected.add(key(u, v));
          frame(`Node ${label(v)} is already settled. Skip edge ${label(u)}–${label(v)}.`, 4, [u, v]);
          continue;
        }
        r.compare();
        const candidate = dist[u] + w;
        frame(
          `Check edge ${label(u)}–${label(v)} (${w}): ${dist[u]} + ${w} = ${candidate} against the current ${fmt(dist[v])}.`,
          5,
          [u, v],
          [u, v]
        );
        if (dist[v] !== INF)
          r.frames.at(-1).ask = ask(
            'bool',
            `Does ${candidate} beat the current distance ${dist[v]} of node ${label(v)}?`,
            candidate < dist[v]
          );
        if (candidate < dist[v]) {
          dist[v] = candidate;
          parent[v] = u;
          frontier.add(v);
          r.move();
          frame(`Improve: node ${label(v)} is now ${candidate}, reached via node ${label(u)}.`, 6, [v]);
        } else {
          rejected.add(key(u, v));
          frame(`No improvement. Node ${label(v)} keeps ${dist[v]}.`, 5, [v]);
        }
      }
    }
    frame(
      `All settled. Distances from node 1: ${dist.map((d, i) => `${label(i)}: ${d}`).join(', ')}.`,
      7,
      []
    );
  },
  check(input, last) {
    const expected = shortestPaths();
    if (!last.sub) return false;
    return expected.every((d, i) => Number(last.sub[i]) === d) && last.marked.length === 7;
  },
};
