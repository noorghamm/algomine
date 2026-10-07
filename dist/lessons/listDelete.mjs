import { ask } from './recorder.mjs';

export default {
  id: 'listDelete',
  topic: 'list',
  name: 'Linked list: delete',
  time: 'O(n)',
  space: 'O(1)',
  view: 'list',
  target: true,
  sample: { input: [4, 8, 3, 7, 2], target: 3 },
  intro:
    'Remove the first node whose value equals the target. Walk the rail from the head while remembering the previous node, then bypass the match by pointing previous.next past it.',
  insight:
    'Unlinking is O(1) once you stand on the previous node, which is why the walk tracks two pointers. Deleting the head is the special case: there is no previous node, so the head pointer moves instead.',
  code: [
    'previous = null; current = head',
    'while current != null and current.value != target',
    '  previous = current; current = current.next',
    'if current == null: return not found',
    'if previous == null: head = current.next',
    'else previous.next = current.next',
    'return head',
  ],
  quiz: [
    {
      question: 'Why does deletion keep a pointer to the previous node?',
      answers: [
        'Only the previous node can be rewired to skip the match',
        'To count the nodes',
        'To delete the previous node too',
      ],
      correct: 0,
      reason: 'A singly linked node knows nothing about who points at it, so the walker has to remember.',
    },
    {
      question: 'What happens when the value to delete is in the head node?',
      answers: [
        'The head pointer moves to the second node',
        'The list is cleared',
        'Nothing, the head cannot be deleted',
      ],
      correct: 0,
      reason: 'With no previous node, the head itself is advanced to current.next.',
    },
    {
      question: 'The target is not in the list. How many nodes were compared?',
      answers: ['All n of them', 'Only the head', 'None'],
      correct: 0,
      reason: 'The walk only stops on a match or at the null pointer after the tail.',
    },
  ],
  run(r) {
    const a = r.a;
    const target = r.target;
    r.emit(`Delete the first block equal to ${target}. previous = null, current = head.`, 0, [0]);
    let i = 0;
    while (i < a.length) {
      r.compare();
      const hit = a[i] === target;
      r.emit(`current = ${a[i]} (index ${i}). Compare with ${target}.`, 1, [i], {
        ask: ask('bool', `Is node ${a[i]} the one to delete?`, hit),
      });
      if (hit) break;
      if (i + 1 < a.length) {
        r.emit(`${a[i]} is not ${target}. previous = ${a[i]}, follow next to ${a[i + 1]}.`, 2, [i], {
          activeEdge: [i, i + 1],
          ask: ask('index', 'Which node is checked next?', i + 1),
        });
      } else {
        r.emit(`${a[i]} is not ${target}. previous = ${a[i]}, and its next pointer is null.`, 2, [i]);
      }
      i++;
    }

    if (i >= a.length) {
      r.emit(`current is null. ${target} is not in the list, nothing to delete.`, 3, []);
      r.emit(`Not found. ${a.length} nodes compared, 0 moves.`, 6, []);
      return;
    }

    if (i === 0) {
      r.emit(
        a.length > 1
          ? `Match at the head. Move head to ${a[1]}.`
          : 'Match at the head. The list becomes empty.',
        4,
        [0],
        a.length > 1 ? { activeEdge: [0, 1] } : {}
      );
    } else {
      r.emit(
        i + 1 < a.length
          ? `Match at index ${i}. Rewire: ${a[i - 1]}.next = ${a[i + 1]}, skipping ${a[i]}.`
          : `Match at the tail. Rewire: ${a[i - 1]}.next = null.`,
        5,
        [i - 1, i],
        i + 1 < a.length ? { activeEdge: [i - 1, i + 1] } : {}
      );
    }
    const removed = a.splice(i, 1)[0];
    r.move();
    if (i > 0) r.marked.push(i - 1);
    r.emit(`Block ${removed} is off the rail. ${a.length} nodes remain, 1 move.`, 6, i > 0 ? [i - 1] : []);
  },
  check(input, last, target) {
    const expected = [...input];
    const at = expected.indexOf(target);
    if (at >= 0) expected.splice(at, 1);
    return JSON.stringify(last.values) === JSON.stringify(expected);
  },
};
