# Lesson contract

A lesson is one module in `dist/lessons/<id>.mjs` with a default export. The registry in
`dist/lessons/index.mjs` loads every id listed in its `manifest`; a missing file is skipped, so a
lesson becomes playable the moment its file exists and its id is in a topic's `algorithms` list in
`dist/algorithms.mjs`.

```js
import { ask } from './recorder.mjs';
import { makeTree, sorted, same } from './shared.mjs';

export default {
  id: 'bubble',            // matches the file name and the id used in topics and courses
  topic: 'sorting',        // topic id from dist/algorithms.mjs
  name: 'Bubble sort',
  time: 'O(n²)',           // shown in the crafting book
  space: 'O(1)',
  view: 'bars',            // optional, overrides the topic's view (see Views)
  target: true,            // optional, lesson needs a search target (number)
  inputKind: 'numbers',    // optional: 'numbers' (default), 'text', 'fixed'
  sample: { input: [7, 3, 9], target: 6 },   // optional default data, overrides the topic values
  intro: 'One or two sentences on what the algorithm does.',
  insight: 'One or two sentences of deeper understanding: invariants, costs, pitfalls.',
  code: ['line 1', '  line 2'],              // pseudocode, highlighted by frame.line (0-based)
  quiz: [ { question, answers: [a, b, c], correct: 0, reason } ],   // three questions
  prepare(r) {},           // optional: runs before the first frame (sort input, build nodes, empty r.a)
  run(r) {},               // the simulation; emit frames with r.emit()
  check(input, lastFrame, target) { return true; },   // used by tests: is the final state correct?
};
```

## The recorder

`run(r)` receives a `Recorder`:

| field / method | meaning |
| --- | --- |
| `r.input` | the original input (array of numbers, or array of characters for text input) |
| `r.target` | the search target or pattern, if any |
| `r.a` | working values shown in the world; mutate it freely |
| `r.marked`, `r.discarded` | indices (or node ids) shown as finished (diamond) or eliminated (dark) |
| `r.aux`, `r.output` | legacy trays; prefer `trays` in `extra` for new lessons |
| `r.nodes` | tree nodes `{id, value, left, right, sub?}` for tree, heap and forest views |
| `r.compare(n = 1)`, `r.move(n = 1)` | bump the counters shown in the stats panel |
| `r.swap(i, j)` | swap two values and count a move |
| `r.emit(message, line, active, extra)` | record a frame; `active` holds highlighted indices or node ids |
| `r.frames.at(-1).ask = ask(...)` | attach a question to the previous frame |

Never mutate `r.input`. Keep messages short, concrete, and in the second person where natural.
Each frame should describe exactly one observable step. Aim for 20 to 120 frames on the sample input.

## Frame extras

Pass these in the `extra` argument of `r.emit`. All are optional.

| key | type | effect |
| --- | --- | --- |
| `swapping` | boolean | the two active indices are swapping (bars view animates it) |
| `activeEdge` | `[a, b]` | highlight the edge between two node ids (tree, graph, list) |
| `incoming` | value | show an INCOMING badge, for a value about to be stored |
| `range`, `depth`, `pivot` | `[lo, hi]`, number, index | context strip for divide-and-conquer lessons |
| `trays` | `[{ label, values, active?, marked? }]` | extra labelled value rows under the scene (count arrays, buckets, distance tables, a stack) |
| `edges` | `[{ from, to, weight?, directed?, state? }]` | graph view: replaces the default edges; `state` is `'idle'`, `'active'`, `'tree'` or `'rejected'` |
| `sub` | `{ [id]: text }` | small secondary label under a node (distance, balance factor, frequency) |
| `roots` | `[id]` | forest view: the root of every separate tree, laid out side by side |
| `grid` | `{ cells, rowLabels, colLabels, active?, marked?, path? }` | grid view: `cells` is a 2D array, `active` is `[r, c]`, `marked` and `path` are lists of `[r, c]` |
| `text` | `{ rows: [{ label, chars, offset?, active?, marked?, discarded? }] }` | text view: one or more rows of lettered blocks; `offset` shifts a row right |
| `ask` | see below | Mine Mode question |

## Asks (Mine Mode)

An ask is a question whose answer the *next* frame reveals. Attach it to the frame before the reveal.

```js
ask('bool', 'Should 7 and 3 swap?', true)
ask('index', 'Which index is inspected next?', 4)              // player clicks a block or value chip
ask('node', 'Which node is visited next?', 3)                  // player clicks a tree or graph node (id)
ask('choice', 'Which way?', 1, ['Go left', 'Go right', 'Found'])   // answer is an option index
```

Add an ask at every point where the algorithm makes a decision the learner should be able to predict.
Two to twelve asks per run is typical. The ask prompt must be answerable from what is on screen.

## Views

A lesson is drawn by the view named by `lesson.view`, or by its topic's `view`.

| view | draws | uses |
| --- | --- | --- |
| `bars` | block towers with heights from values | `values`, `active`, `marked`, `discarded`, `swapping` |
| `array` | one block per value in a row | `values` (numbers or strings), `active`, `marked`, `discarded` |
| `list` | array plus pointer links | `activeEdge` |
| `hash` | chests, one per slot; a slot may hold an array (a chain) | `values` with `null` for empty |
| `stack`, `queue` | vertical pile or horizontal line of chests | `values` |
| `tree` | binary tree from `nodes` starting at id 0 | `nodes`, `activeEdge`, `sub` |
| `forest` | several trees from `roots` | `nodes`, `roots`, `sub` |
| `graph` | the seven-node map | `edges`, `activeEdge`, `sub`, node ids 0 to 6 shown as 1 to 7 |
| `grid` | a table of blocks | `grid` |
| `text` | rows of lettered blocks | `text` |

## Input kinds

- `numbers` (default): the inventory dialog accepts 3 to 10 whole numbers. `r.input` is a number array.
- `text`: the dialog accepts a short string (letters, digits, brackets). `r.input` is an array of characters and
  `r.target` is the pattern string when `target: true`.
- `fixed`: no editing (the graph lessons use the fixed map).

## Tests

`tests/lessons.test.mjs` runs every lesson on its sample input and on several generated inputs and checks:
frames exist, every `line` is inside `code`, every active index is valid, the last frame has `complete: true`,
every ask is well formed, every quiz has a valid `correct` index, and `check()` returns true.
Add lesson-specific assertions in `tests/lessons/<group>.test.mjs`.

## Style

- No em dashes in copy or comments. Use a comma, colon or a new sentence.
- Keep the Minecraft-flavoured tone light: blocks, chests, biomes, but the algorithm words stay precise.
- Pseudocode lines are plain text; use `−` for minus only inside pseudocode, matching existing lessons.
