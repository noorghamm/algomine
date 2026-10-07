// Helpers shared by several lessons.

// Build a binary tree as a flat node list. Node ids are array indices.
// For a BST, duplicate values are skipped. For a heap, the array order is the level order.
export function makeTree(values, heap = false) {
  if (heap)
    return values.map((value, i) => ({
      id: i,
      value,
      left: i * 2 + 1 < values.length ? i * 2 + 1 : null,
      right: i * 2 + 2 < values.length ? i * 2 + 2 : null,
    }));
  const nodes = [];
  for (const value of values) {
    if (nodes.some(n => n.value === value)) continue;
    const node = { id: nodes.length, value, left: null, right: null };
    if (!nodes.length) {
      nodes.push(node);
      continue;
    }
    let p = nodes[0];
    while (true) {
      const side = value < p.value ? 'left' : 'right';
      if (p[side] === null) {
        p[side] = node.id;
        nodes.push(node);
        break;
      }
      p = nodes[p[side]];
    }
  }
  return nodes;
}

// The fixed seven-node undirected map used by the graph lessons. Node ids are 0 to 6.
export const graphEdges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 6],
  [4, 6],
  [5, 6],
];

// The same map with weights, for shortest-path and spanning-tree lessons.
export const weightedEdges = [
  [0, 1, 4],
  [0, 2, 2],
  [1, 3, 5],
  [1, 4, 1],
  [2, 4, 8],
  [2, 5, 3],
  [3, 6, 2],
  [4, 6, 6],
  [5, 6, 7],
];

// A directed acyclic version of the map, for topological ordering.
export const directedEdges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 6],
  [4, 6],
  [5, 6],
];

export const sorted = values => [...values].sort((x, y) => x - y);
export const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
