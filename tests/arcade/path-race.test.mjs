import assert from 'node:assert/strict';
import { decisionPoints, traysOf, questionFor, ROUNDS } from '../../dist/arcade/path-race.mjs';
import { simulate } from '../../dist/algorithms.mjs';

const map = [1, 2, 3, 4, 5, 6, 7];

// Each point names the frame where a new node joins `marked`, and that node is the newest one.
function checkPoints(frames, points) {
  let last = -1;
  for (const { frameIndex, nodeId } of points) {
    assert.ok(frameIndex > last, 'frame indices increase');
    last = frameIndex;
    const marked = frames[frameIndex].marked;
    const before = frames[frameIndex - 1].marked;
    assert.equal(marked.length, before.length + 1, 'exactly one new node per point');
    assert.equal(marked.at(-1), nodeId, 'the point names the newly marked node');
    assert.ok(!before.includes(nodeId), 'the node was not marked before');
  }
}

// BFS from node 1 with neighbours in numeric order visits the nodes in id order.
{
  const frames = simulate('bfs', map);
  const points = decisionPoints(frames);
  assert.deepEqual(
    points.map(p => p.nodeId),
    [0, 1, 2, 3, 4, 5, 6]
  );
  checkPoints(frames, points);
  const sample = frames[points[1].frameIndex - 1];
  assert.deepEqual(traysOf(sample, 'bfs')[0].label, 'QUEUE');
  assert.ok(traysOf(sample, 'bfs')[0].values.length > 0, 'the queue holds discovered nodes');
}

// DFS visits 1, 2, 4, 7, 5, 3, 6 (ids 0, 1, 3, 6, 4, 2, 5).
{
  const frames = simulate('dfs', map);
  const points = decisionPoints(frames);
  assert.deepEqual(
    points.map(p => p.nodeId),
    [0, 1, 3, 6, 4, 2, 5]
  );
  checkPoints(frames, points);
  assert.equal(traysOf(frames[2], 'dfs')[0].label, 'STACK');
}

// Dijkstra settles all seven nodes, starting from node 1, and carries a FRONTIER tray plus distances.
{
  const frames = simulate('dijkstra', map);
  const points = decisionPoints(frames);
  assert.equal(points.length, 7);
  assert.equal(points[0].nodeId, 0);
  assert.deepEqual(
    [...points.map(p => p.nodeId)].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6]
  );
  checkPoints(frames, points);
  const frame = frames[points[1].frameIndex - 1];
  const trays = traysOf(frame, 'dijkstra');
  assert.equal(trays[0].label, 'FRONTIER');
  assert.ok(trays[0].values.length > 0);
  assert.ok(frame.sub && frame.sub[0] === '0', 'tentative distances travel in frame.sub');
}

// A synthetic frame list: marks that do not grow are not decision points.
assert.deepEqual(decisionPoints([{ marked: [] }, { marked: [2] }, { marked: [2] }, { marked: [2, 5] }]), [
  { frameIndex: 1, nodeId: 2 },
  { frameIndex: 3, nodeId: 5 },
]);
assert.deepEqual(decisionPoints([]), []);
assert.deepEqual(decisionPoints([{ message: 'no marks' }, { message: 'still none' }]), []);

assert.equal(questionFor('dijkstra'), 'Which node is settled next?');
assert.equal(questionFor('bfs'), 'Which node is visited next?');
assert.deepEqual(ROUNDS, ['bfs', 'dfs', 'dijkstra']);

console.log('path-race: decision points checked for bfs, dfs and dijkstra.');
