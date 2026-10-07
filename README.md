# AlgoMine

A block-built playground for learning data structures and algorithms. Eleven voxel biomes, thirty-seven
lessons, a Mine Mode where you make every decision yourself, an arcade of short DSA games, and a creative
build mode. Everything runs in the browser with no build step and no runtime dependencies.

Live site: https://noorghamm.github.io/algomine/

## Play

- **Watch**: step through any lesson with play, pause, previous, next, a timeline and playback speed. Edit the
  input or pick a preset. Drag the world to orbit, scroll to zoom, switch between day and night.
- **Mine Mode**: the lesson pauses at every decision the algorithm makes and asks you to make it: will these
  two blocks swap, which chest does 17 land in, which node is visited next, go left or right. Click a block in
  the world, a value chip, or an option. A flawless run earns extra XP.
- **Practice quests**: three knowledge-check questions per lesson.
- **The Arcade**: Pseudocode Forge (rebuild scrambled pseudocode and fill the gaps), Sort Detective, Complexity
  Rush, Trace Trial, Hash Rush, BST Builder, Path Race and Stack Attack. High scores earn XP and sit in your journal.
- **Progression**: XP, ten levels from Dirt Digger to Beacon Legend, achievements, a daily streak, and a
  shareable progress card. Progress lives in this browser; export and import it from Settings.
- **Build Mode**: a 9 × 9 plot per biome, eight materials, undo and redo, and Sort My Build, which feeds your
  column heights into merge sort.
- **Settings**: dark or light theme, reduced motion, block sounds, hints. The site installs as an offline app.

Keyboard: `Space` plays or pauses, `←` `→` step, `M` and `W` switch Mine and Watch, `/` focuses search,
`?` opens the keyboard help. In Build Mode the arrows move the cursor, `Space` places, `X` mines, `1` to `8`
pick a material and `⌘Z` undoes.

## Worlds and lessons

| World | Lessons |
| --- | --- |
| Sorting Plains | Bubble, selection, insertion, merge, quicksort, heapsort, counting sort, radix sort |
| Search Quarry | Linear and binary search |
| Redstone Railway | Linked-list traversal, insertion, deletion |
| Storage Stronghold | Stack, queue, balanced brackets |
| Binary Forest | BST search, in-order, pre-order, post-order, BST insert, BST delete |
| Canopy Citadel | AVL insertion with rotations |
| Pathfinder Valley | BFS, DFS, Dijkstra, Prim's MST, topological sort |
| Diamond Peak | Build a max heap, heap insert, extract max |
| Chest Archives | Linear probing, separate chaining |
| Rune Library | Brute-force matching, KMP, edit distance |
| Compression Forge | Huffman coding |

The course map groups these into the chapters of Algorithms & Data Structures 2 and Algorithmics I with
PDF page references. The source slide decks are not part of this repository.

## Run locally

Requires Node.js 22 or later. There are no runtime dependencies and no build step.

```bash
npm run dev
```

Open http://localhost:4173. `PORT=8080 npm run dev` picks a different port.

```bash
npm run check   # syntax-check every script
npm test        # run every test under tests/
npm run lint    # prettier --check (needs `npm install` once for the dev dependency)
npm run format  # prettier --write
```

GitHub Actions runs the checks on every push and pull request, and the Publish workflow deploys `dist/`
to GitHub Pages on pushes to main.

## Source layout

```
dist/
  index.html          page shell: home, lesson workbench, build mode, arcade, dialogs
  style.css           layout, block-world chrome, light theme
  app.js              bootstrap, routing, home screen, course map, journal
  lab.mjs             lesson workbench: playback, Mine Mode, practice quests, data editor
  world.mjs           canvas voxel renderer and the named views (bars, array, list, hash, stack, tree, forest, graph, grid, text)
  algorithms.mjs      topics (worlds) and re-exports of the lesson registry
  lessons/            one module per lesson plus recorder.mjs, shared.mjs and index.mjs (the manifest)
  arcade/             the arcade hub, shared game helpers and one module per game
  progress.mjs        XP, levels, achievements, streaks, settings, export and import
  settings.mjs        settings dialog and theme
  share.mjs           progress card renderer
  sound.mjs           Web Audio block sounds
  builder.mjs, build-state.mjs   creative build mode
  courses.mjs         course map
  sw.js, manifest.webmanifest    offline support
tests/                node:test suites: algorithms, build state, every lesson, per-topic lesson checks, arcade helpers
docs/                 lesson-contract.md and game-contract.md
```

## Adding a lesson

Read `docs/lesson-contract.md`, create `dist/lessons/<id>.mjs`, add the id to the manifest in
`dist/lessons/index.mjs` and to a topic's `algorithms` list in `dist/algorithms.mjs`, then run `npm test`.
The generic lesson test checks frames, pseudocode line bounds, asks, quiz shape and your `check()` on a set of
generated inputs. Add a game the same way with `docs/game-contract.md`.

## How this was built

<!-- TODO: Noor writes this section. -->

## Scope

This is an independent educational project with original voxel graphics. It is not affiliated with Minecraft,
Mojang, Microsoft, or VisuAlgo. The visualization approach was inspired by https://visualgo.net/en; its code
and assets are not used. Progress is browser-local and does not sync between devices unless you export it.
