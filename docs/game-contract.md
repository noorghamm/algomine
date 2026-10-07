# Arcade game contract

A game is one module in `dist/arcade/<id>.mjs` with a default export. The registry in
`dist/arcade/games.mjs` lists ids in its `manifest`; a missing file is skipped.

```js
import { el, shuffle, pick } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { intro, hud, countdown, gameOver, optionButtons, flash } from './common.mjs';

export default {
  id: 'forge',                 // matches the file name and the manifest entry
  name: 'Pseudocode Forge',
  icon: '⚒',                   // one character
  color: '#f3a86b',
  tagline: 'One sentence shown on the card and above the game.',
  skills: 'Pseudocode · every lesson',   // short, uppercase styled
  start(host, api) {
    // host is an empty <div class="arcade-game">. Build the whole game inside it.
    // Return { destroy() } to clear timers and listeners when the player leaves.
    return { destroy() {} };
  },
};
```

Rules:

- Every game starts with `intro()` (what to do, how scoring works) and a START button, runs, then ends with
  `gameOver()` which records the score through the progress store (XP is awarded automatically, score / 10, max 150).
- Scores are whole numbers. A typical good run should land between 200 and 1500 so XP and the 500-point
  achievement make sense. Reward speed and streaks; penalise mistakes but never below zero.
- Use lesson data from `dist/algorithms.mjs`: `definitions[id]` (name, code, time, space, quiz), `simulate(id, input, target)`
  for frames, `topics` for grouping. Never hardcode what a lesson already knows.
- Keyboard: number keys 1 to 9 or A to D should pick options where options exist. Everything must work with a mouse or touch.
- Clean up on `destroy()`: clear intervals and timeouts, remove document-level listeners, disconnect observers.
- Styling: reuse the classes in `dist/style.css` under the v3 section: `.game-hud`, `.game-prompt`, `.game-options` with `.answer`,
  `.code-puzzle`, `.code-slot`, `.code-piece`, `.code-gap`, `.timer-bar`, `.chest-row`, `.chest-slot`, `.queue-row`, `.big-chip`,
  `.game-canvas`, `.game-intro`, `.game-over`. Add new rules only if needed, in a `<style>`-free way: append to `dist/style.css`
  under a comment with the game id, scoped to `.game-<id>` (the host gets that class).
- The `VoxelWorld` renderer in `dist/world.mjs` can draw a scene into any canvas:
  `new VoxelWorld(canvas).set({ topic, terrain, view, frame, algorithm })`. Use it where a block scene makes the game better
  (Sort Detective, Path Race). Call `.destroy()` on it in `destroy()`.
- No em dashes in any copy. Light Minecraft flavour, precise algorithm words.
- Add a logic test in `tests/arcade/<id>.test.mjs` for any pure helper (question generation, scoring, validation); keep DOM code out of tests.
