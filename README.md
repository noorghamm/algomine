# AlgoMine

A block-built playground for learning data structures and algorithms. Explore eight voxel biomes with sixteen lessons, editable inputs, step-by-step playback, pseudocode, and practice quests.

**Live site:** https://blockcraft-algorithm-world.noorghammari.chatgpt.site (private; ChatGPT sign-in required).

## Public hosting with GitHub Pages

The `Publish AlgoMine` workflow validates the application, uploads only `dist/`, and deploys to GitHub Pages on pushes to `main`. It can also be started manually from Actions. Repository Settings → Pages must use **GitHub Actions** as its publishing source.

Public address after a successful deployment: https://noorghamm.github.io/algomine/

Relative asset URLs and hash routes support the `/algomine/` project path. The existing private Sites deployment is separate. Browser-local progress and builds belong to each site's origin and are not transferred between hosts.

## Run locally

Requires Node.js 22 or later. There are no npm dependencies and no build step.

```sh
npm run dev
```

Open http://localhost:4173. To choose a different port:

```sh
PORT=8080 npm run dev
```

## Check the project

```sh
npm run check
npm test
```

The test suite checks sorting results, search hits and misses, stack/queue ordering, tree and graph traversals, heap invariants, hash collisions, and pseudocode bounds. GitHub Actions runs these checks on pushes and pull requests.

## Explore

| World | Lessons |
| --- | --- |
| Sorting Plains | Bubble, selection, insertion, merge sort and quicksort |
| Search Quarry | Binary and linear search |
| Redstone Railway | Linked-list traversal |
| Storage Stronghold | Stack push/pop and queue enqueue/dequeue |
| Binary Forest | BST search and in-order traversal |
| Pathfinder Valley | Breadth-first and depth-first search |
| Diamond Peak | Bottom-up max-heap construction |
| Chest Archives | Hashing with linear probing |

Use play/pause, previous/next step, the timeline, and playback speed controls. Edit values or choose input presets. Drag the world to orbit, scroll to zoom, and switch between day and night. Practice quests and completed lessons earn XP, saved in the current browser's local storage.

**Keyboard:** Space plays/pauses, arrow keys step, and `/` focuses catalogue search. Keyboard playback shortcuts are inactive when an input or button has focus.

## Block-world interface

Original pixel-art item icons form a clickable eight-slot world hotbar. Wood, stone and dirt textures frame the interface; lessons use a parchment crafting book and inventory-style playback controls. The experience bar reflects explored lessons. Voxel terrain includes grass edges, exposed stone and ore, block trees and torches that glow in night mode. All textures and item sprites are project-authored SVGs in `dist/assets/`.

## Creative build mode

Open **Build** in the header, **Build Your World** on the home screen, or **Build Mode** inside a lesson. Each biome has its own browser-local 9 × 9 plot, with up to 256 placed blocks and six levels of height. Choose from eight materials, click/tap a top face to stack, or a visible side face to attach a block. Mine removes placed blocks; the island base is protected. Floating structures are allowed.

Undo/redo keeps the last 50 edits in the current session. Clearing a plot is undoable. Builds autosave in this browser and survive refresh; history and material selection do not persist across refresh. A storage failure is reported in the builder. Builds do not sync across devices.

For keyboard use, focus the plot: arrows move the ground-column cursor, Space/Enter uses the selected tool, X mines the top block, 1–8 selects a material, and Ctrl/Command-Z undoes (Shift to redo). X/Y selectors and an action button provide an alternative to canvas interaction. Dragging orbits and scrolling zooms.

**Sort my build** uses the heights of 3–10 occupied columns as merge-sort input, ordered by Y then X. Height is the highest occupied level plus one, including gaps beneath floating blocks. The source build is preserved. Creative builds use dedicated plots and do not modify lesson data unless this action is chosen.

## Course paths

The course map follows **Algorithms & Data Structures 2** and **Algorithmics I** from the supplied lecture decks. It groups the syllabus into 13 chapters, links implemented lessons, and explicitly marks remaining topics as roadmap coverage. References use one-based PDF page numbers. The second Algorithmics deck contains revision material, not a third course.

Merge sort shows the pending merge buffer, active range and recursion depth. Quicksort uses last-pivot Lomuto partitioning, matching the ADS partitioning example. Its worst-case time and stack costs are shown explicitly. Course links support direct routes such as `#world/sorting/merge`.

Only original summaries and implementations are included. The source PDFs and extracted slide text are not distributed in this repository. Mapped syllabus coverage is not a claim that all course lessons or exam preparation are implemented.

## Source layout

- `dist/index.html`: catalogue, lesson workbench, and dialogs
- `dist/style.css`: responsive layout and block-inspired styling
- `dist/algorithms.mjs`: lesson definitions and pure simulation functions
- `dist/builder.mjs`: builder controls, per-biome local saving and sorting handoff
- `dist/build-state.mjs`: placement validation, face picking helpers and undoable build state
- `tests/build-state.test.mjs`: building rules, history, storage round trips and height extraction
- `dist/courses.mjs`: original course map, PDF page references and playable lesson links
- `dist/world.mjs`: canvas voxel renderer, camera, and swap animations
- `dist/app.js`: navigation, playback, input validation, practice, and local progress
- `tests/algorithms.test.mjs`: algorithm verification
- `scripts/serve.mjs`: dependency-free local development server
- `.openai/hosting.json`: existing private Sites deployment identity

`dist/` contains the editable source and deployable static files; it is intentionally tracked. Any static host supporting JavaScript modules can serve it. Hash-based routes do not need server rewrites. Google Fonts is the only runtime external asset dependency; fallback fonts are provided.

## Scope

This is an independent educational project with original voxel graphics. It is not affiliated with Minecraft, Mojang, Microsoft, or VisuAlgo. The topic-library and visualization approach was inspired by https://visualgo.net/en; its code and assets are not used.

The graph lesson uses a fixed seven-node undirected map. Tree lessons omit duplicate values. Binary search sorts its input automatically. Progress is browser-local and does not sync between devices. Complexity labels describe the demonstrated algorithms, not the visualization's stored animation frames.

## Contributing

Keep simulation logic in `dist/algorithms.mjs` and visual presentation in `dist/world.mjs`. Add meaningful algorithm checks when introducing a new lesson. Run both check commands and inspect the affected lesson in a browser at desktop and mobile widths before opening a pull request.
