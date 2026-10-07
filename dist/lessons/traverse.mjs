import { ask } from './recorder.mjs';

export default {
  id: 'traverse',
  topic: 'list',
  name: 'Traverse a linked list',
  time: 'O(n)',
  space: 'O(1)',
  intro:
    'Begin at the head and follow each next pointer. The redstone connections show how nodes link together in memory.',
  insight:
    'Unlike an array, a linked list does not offer constant-time indexed access. To reach a node, follow the preceding links.',
  code: [
    'current = head',
    'while current != null',
    '  visit(current.value)',
    '  current = current.next',
    'return visited values',
  ],
  quiz: [
    {
      question: 'How do you reach the fourth node of a singly linked list?',
      answers: [
        'Follow next pointers from the head',
        'Jump directly to index 3',
        'Follow the tail pointer backward',
      ],
      correct: 0,
      reason: 'A singly linked list exposes a next pointer at each node, so traversal starts at the head.',
    },
    {
      question: 'What marks the end of a singly linked list?',
      answers: ['A next pointer that is null', 'A node with value 0', 'The head pointer'],
      correct: 0,
      reason: 'The last node points to nothing, which the traversal loop checks for.',
    },
    {
      question: 'What is the cost of reaching the last of n nodes?',
      answers: ['O(n)', 'O(1)', 'O(log n)'],
      correct: 0,
      reason: 'Every earlier node must be visited first because there is no indexed access.',
    },
  ],
  run(r) {
    const a = r.a;
    for (let i = 0; i < a.length; i++) {
      r.compare();
      r.emit(`Visit node ${a[i]}. ${i === 0 ? 'This is the head.' : ''}`.trim(), 2, [i]);
      r.marked.push(i);
      r.output.push(a[i]);
      r.emit(
        i === a.length - 1
          ? 'The next pointer is null. End of the list.'
          : `Follow next to node ${a[i + 1]}.`,
        3,
        [i],
        {
          activeEdge: [i, i + 1],
          ask:
            i < a.length - 1
              ? ask('index', 'Which node is visited next?', i + 1)
              : ask('choice', 'What happens now?', 0, [
                  'The traversal ends',
                  'Go back to the head',
                  'Visit a random node',
                ]),
        }
      );
    }
    r.emit('Traversal complete. Every node was visited in order.', 4);
  },
  check(input, last) {
    return JSON.stringify(last.output) === JSON.stringify(input);
  },
};
