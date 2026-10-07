import { ask } from './recorder.mjs';

// The value of the new node is always 5, so the learner can focus on the pointer walk.
const NEW_VALUE = 5;

// Clamp the requested position to [0, length]: anything past the end means "append at the tail".
const clampPosition = (target, length) => Math.min(Math.max(0, Math.floor(Number(target) || 0)), length);

export default {
  id: 'listInsert',
  topic: 'list',
  name: 'Linked list: insert',
  time: 'O(n)',
  space: 'O(1)',
  view: 'list',
  target: true,
  sample: { input: [4, 8, 3, 7, 2], target: 2 },
  intro:
    'Insert a new block (value 5) at a 0-based position along the redstone rail. Walk from the head to the node just before that position, then rewire two next pointers. A position past the end appends at the tail.',
  insight:
    'The splice itself is O(1): two pointer changes. The cost is the walk to reach the spot, which is O(n) because a singly linked list has no indexed access.',
  code: [
    'new = node(5)',
    'if pos == 0: new.next = head; head = new',
    'current = head; i = 0',
    'while i < pos − 1 and current.next != null',
    '  current = current.next; i = i + 1',
    'new.next = current.next',
    'current.next = new',
    'return head',
  ],
  quiz: [
    {
      question: 'To insert at position 3 of a singly linked list, which node do you walk to first?',
      answers: ['The node at position 2', 'The node at position 3', 'The tail'],
      correct: 0,
      reason: 'Only the node before the gap can be rewired to point at the new node, so you stop one short.',
    },
    {
      question: 'How many pointers change when a node is spliced into the middle of a list?',
      answers: ['Two', 'One', 'Every pointer after it'],
      correct: 0,
      reason:
        'The new node takes over the next pointer of its predecessor, and the predecessor points to the new node.',
    },
    {
      question: 'Which insert is O(1) in a singly linked list with only a head pointer?',
      answers: ['At the head', 'At the tail', 'In the middle'],
      correct: 0,
      reason: 'The head is reachable immediately; every other position requires a walk along next pointers.',
    },
  ],
  run(r) {
    const a = r.a;
    const length = a.length;
    const pos = clampPosition(r.target, length);
    const beyond = Number(r.target) > length;
    r.emit(
      `Craft a new block with value ${NEW_VALUE}. It goes at position ${pos}${beyond ? ` (position ${r.target} is past the end, so append at the tail)` : ''}.`,
      0,
      [],
      { incoming: NEW_VALUE }
    );

    if (pos === 0) {
      r.emit('Position 0 means the new node becomes the head. No walk needed.', 1, [0], {
        incoming: NEW_VALUE,
        activeEdge: [0, 1],
      });
      a.splice(0, 0, NEW_VALUE);
      r.move();
      r.marked.push(0);
      r.emit(`Point the new node at ${a[1]} and make it the head.`, 1, [0, 1], { activeEdge: [0, 1] });
      r.emit(`Inserted ${NEW_VALUE} at position 0 with 0 links followed and 1 move.`, 7, [0]);
      return;
    }

    let i = 0;
    let links = 0;
    r.emit(`Start at the head, node ${a[0]} (index 0). Walk to index ${pos - 1}.`, 2, [0]);
    while (true) {
      const stop = i === pos - 1 || i === length - 1;
      r.emit(`At node ${a[i]} (index ${i}). Need index ${pos - 1}. Stop here?`, 3, [i], {
        incoming: NEW_VALUE,
        ask: ask('bool', `Is index ${i} the node to attach the new block after?`, stop),
      });
      if (stop) break;
      links++;
      r.emit(`Not yet. Follow next from ${a[i]} to ${a[i + 1]}.`, 4, [i], {
        activeEdge: [i, i + 1],
        incoming: NEW_VALUE,
        ask: ask('index', 'Which node is visited next?', i + 1),
      });
      i++;
    }

    if (i < pos - 1) {
      r.emit(`Node ${a[i]} has a null next pointer. The rail ends here, so append at the tail.`, 5, [i], {
        incoming: NEW_VALUE,
      });
    } else {
      r.emit(
        i + 1 < length
          ? `Stop at index ${i}. The new node will point at ${a[i + 1]}.`
          : `Stop at index ${i}, the tail. The new node will point at null.`,
        5,
        [i],
        { incoming: NEW_VALUE, ...(i + 1 < length ? { activeEdge: [i, i + 1] } : {}) }
      );
    }
    const at = i + 1;
    a.splice(at, 0, NEW_VALUE);
    r.move();
    r.marked.push(at);
    r.emit(`Rewire: ${a[i]}.next = the new node ${NEW_VALUE}.`, 6, [i, at], { activeEdge: [i, at] });
    r.emit(
      `Inserted ${NEW_VALUE} at index ${at}. Followed ${links} link${links === 1 ? '' : 's'}, 1 move.`,
      7,
      [at]
    );
  },
  check(input, last, target) {
    const expected = [...input];
    expected.splice(clampPosition(target, input.length), 0, NEW_VALUE);
    return JSON.stringify(last.values) === JSON.stringify(expected);
  },
};
