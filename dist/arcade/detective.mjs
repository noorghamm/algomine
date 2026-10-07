// Sort Detective: an unnamed sorting lesson runs on a block row. Name it as early as you dare.
import { el, chip, shuffle } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { definitions, simulate } from '../algorithms.mjs';
import { VoxelWorld } from '../world.mjs';
import { intro, hud, gameOver, optionButtons, flash } from './common.mjs';

export const ROUNDS = 6;
// Milliseconds between frames, by round. The run gets faster as the case goes on.
export const SPEEDS = [450, 450, 380, 380, 320, 320];
export const CANDIDATES = [
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'heapsort',
  'counting',
  'radix',
];
export const VALUE_COUNT = 7;
export const VALUE_MAX = 12;

// Only the sorting lessons that actually exist in the registry.
export const sortingLessons = () => CANDIDATES.filter(id => definitions[id]);

// Points for a correct guess after `framesShown` frames: 200 minus 2 per frame, never below 40.
export const guessScore = framesShown => Math.max(40, 200 - 2 * framesShown);
export const WRONG_COST = 30;

// Pure: pick a lesson and a row of distinct values, then record its frames. rng() returns [0, 1).
export function makeRound(rng, lessonIds = sortingLessons()) {
  const lessonId = lessonIds[Math.floor(rng() * lessonIds.length)];
  const pool = Array.from({ length: VALUE_MAX }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const values = pool.slice(0, VALUE_COUNT);
  return { lessonId, values, frames: simulate(lessonId, values) };
}

const chipState = (frame, i) =>
  frame.active.includes(i)
    ? 'active'
    : frame.marked.includes(i)
      ? 'marked'
      : frame.discarded.includes(i)
        ? 'discarded'
        : '';

export default {
  id: 'detective',
  name: 'Sort Detective',
  icon: '⌕',
  color: '#b4e77e',
  tagline: 'Watch a nameless sort move the blocks and call its name before the run ends.',
  skills: 'Sorting · recognising algorithms',
  start(host, api) {
    let alive = true;
    const timers = new Set();
    let interval = null;
    let world = null;
    let onKey = null;

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const stopAnimation = () => {
      clearInterval(interval);
      interval = null;
    };
    const teardown = () => {
      stopAnimation();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      if (world) {
        cancelAnimationFrame(world.animation);
        world.destroy();
        world = null;
      }
      if (onKey) {
        document.removeEventListener('keydown', onKey);
        onKey = null;
      }
    };

    const showIntro = () =>
      intro(host, {
        title: 'Sort Detective',
        text:
          'A sorting lesson runs on a random block row with its name hidden. Name it from the buttons as soon as you know. ' +
          `A correct guess scores 200 minus 2 per frame already shown, never below 40. A wrong guess costs ${WRONG_COST} ` +
          'and greys out that option while the run keeps going. If the run finishes first, the round scores 0. ' +
          `${ROUNDS} rounds, and each case plays faster. The comparison and move counters are honest clues. ` +
          'Keys 1 to 8 or A to H pick an option.',
        onStart: play,
      });

    function play() {
      teardown();
      const lessons = sortingLessons();
      let round = 0;
      let score = 0;
      let solved = 0;
      let wrongGuesses = 0;

      const board = el('div', { class: 'game-board' });
      host.replaceChildren(board);
      const update = hud(board, [
        { id: 'round', label: 'ROUND' },
        { id: 'score', label: 'SCORE' },
        { id: 'frame', label: 'FRAME' },
        { id: 'comparisons', label: 'COMPARISONS' },
        { id: 'moves', label: 'MOVES' },
        { id: 'worth', label: 'WORTH NOW' },
      ]);
      const prompt = el('p', { class: 'game-prompt' });
      const canvas = el('canvas', { class: 'game-canvas' });
      const trayChips = el('div');
      const tray = el('div', { class: 'state-tray' }, el('span', { text: 'VALUES' }), trayChips);
      const optionsHost = el('div');
      board.append(prompt, canvas, tray, optionsHost);
      world = new VoxelWorld(canvas);

      onKey = e => {
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key;
        let i = -1;
        if (/^[1-9]$/.test(k)) i = Number(k) - 1;
        else if (/^[a-hA-H]$/.test(k)) i = k.toLowerCase().charCodeAt(0) - 97;
        if (i < 0) return;
        const button = optionsHost.querySelectorAll('button.answer')[i];
        if (!button || button.disabled) return;
        e.preventDefault();
        button.click();
      };
      document.addEventListener('keydown', onKey);

      function nextRound() {
        round++;
        const { lessonId, frames } = makeRound(Math.random, lessons);
        const order = shuffle(lessons);
        const wrongHere = new Set();
        let shown = 0;
        let locked = false;

        update({ round: `${round} / ${ROUNDS}`, score });
        prompt.textContent = 'Which sort is this? Guess early for more points.';
        optionsHost.replaceChildren(
          optionButtons(
            order.map(id => definitions[id].name),
            (i, button) => guess(i, button)
          )
        );
        const buttons = () => [...optionsHost.querySelectorAll('button.answer')];

        const showFrame = () => {
          const frame = frames[shown];
          shown++;
          world.set({ topic: 'sorting', terrain: 'grass', view: 'bars', algorithm: lessonId, frame });
          trayChips.replaceChildren(...frame.values.map((v, i) => chip(v, chipState(frame, i))));
          update({
            frame: `${shown} / ${frames.length}`,
            comparisons: frame.comparisons,
            moves: frame.moves,
            worth: guessScore(shown),
          });
          if (frame.swapping) sound.step(shown);
          if (shown >= frames.length) {
            stopAnimation();
            reveal();
          }
        };

        const guess = (i, button) => {
          if (locked || wrongHere.has(i)) return;
          const id = order[i];
          if (id === lessonId) {
            locked = true;
            stopAnimation();
            const gained = guessScore(shown);
            score += gained;
            solved++;
            flash(button, true);
            for (const b of buttons()) b.disabled = true;
            update({ score });
            prompt.textContent = `${definitions[id].name}! Named after ${shown} frames for +${gained}.`;
            later(advance, 1400);
          } else {
            wrongHere.add(i);
            wrongGuesses++;
            score = Math.max(0, score - WRONG_COST);
            flash(button, false);
            button.disabled = true;
            update({ score });
            prompt.textContent = `Not ${definitions[id].name}. Minus ${WRONG_COST}. The run continues.`;
          }
        };

        const reveal = () => {
          if (locked) return;
          locked = true;
          const i = order.indexOf(lessonId);
          const list = buttons();
          list[i]?.classList.add('correct');
          for (const b of list) b.disabled = true;
          sound.wrong();
          prompt.textContent = `The run finished. It was ${definitions[lessonId].name}. No points this round.`;
          later(advance, 1800);
        };

        showFrame();
        interval = setInterval(showFrame, SPEEDS[Math.min(round, SPEEDS.length) - 1]);
      }

      function advance() {
        if (round >= ROUNDS) finish();
        else nextRound();
      }

      function finish() {
        teardown();
        gameOver(host, {
          gameId: 'detective',
          score,
          summary: `${solved} of ${ROUNDS} sorts named, ${wrongGuesses} wrong ${wrongGuesses === 1 ? 'guess' : 'guesses'}.`,
          onReplay: play,
        });
        api?.onScore?.(score);
      }

      nextRound();
    }

    showIntro();
    return {
      destroy() {
        alive = false;
        teardown();
      },
    };
  },
};
