// BST Builder: grow a binary search tree by picking the parent and the side for each new value.
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { makeTree } from '../algorithms.mjs';
import { VoxelWorld } from '../world.mjs';
import { intro, hud, countdown, gameOver, optionButtons, flash } from './common.mjs';

const ROUNDS = 3;
const PER_ROUND = 7;
const SECONDS = 10;
const CORRECT = 70;
const SPEED_BONUS = 30;
const PENALTY = 20;
const QUIZ_BONUS = 50;
const OPTION_KEYS = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };

// Where `value` attaches to the BST built from `values` (ids follow insertion order, like makeTree).
// A duplicate reports the node holding that value with side null; an empty tree reports null twice.
export function insertParent(values, value) {
  const nodes = makeTree(values);
  if (!nodes.length) return { parentIndex: null, side: null };
  let p = nodes[0];
  for (;;) {
    if (value === p.value) return { parentIndex: p.id, side: null };
    const side = value < p.value ? 'left' : 'right';
    if (p[side] === null) return { parentIndex: p.id, side };
    p = nodes[p[side]];
  }
}

// Height counted in levels: an empty tree is 0 and a lone root is 1.
export function treeHeight(nodes, root = 0) {
  if (!nodes.length) return 0;
  const h = id =>
    id === null || id === undefined || !nodes[id] ? 0 : 1 + Math.max(h(nodes[id].left), h(nodes[id].right));
  return h(root);
}

// The comparisons made on the way down, as one short explanation.
export function explainInsert(values, value) {
  const nodes = makeTree(values);
  if (!nodes.length) return `${value} becomes the root.`;
  const steps = [];
  let p = nodes[0];
  let side = null;
  for (;;) {
    if (value === p.value) return `${value} is already in the tree.`;
    side = value < p.value ? 'left' : 'right';
    steps.push(`${value} is ${side === 'left' ? 'smaller' : 'larger'} than ${p.value}, so go ${side}`);
    if (p[side] === null) break;
    p = nodes[p[side]];
  }
  return `${steps.join('. ')}. The ${side} slot under ${p.value} is empty, so ${value} goes there.`;
}

// Distinct values from 1 to `max`, drawn with `rng` (a function returning 0 to 1).
export function pickValues(rng, count = PER_ROUND, max = 30) {
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  const out = [];
  while (out.length < count && pool.length) {
    const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)));
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// Four distinct answers in ascending order, one of them the real height.
export function heightOptions(height, rng) {
  const options = new Set([height]);
  const spread = [height - 2, height - 1, height + 1, height + 2, height + 3].filter(h => h >= 1);
  while (options.size < 4 && spread.length) {
    const i = Math.min(spread.length - 1, Math.max(0, Math.floor(rng() * spread.length)));
    options.add(spread.splice(i, 1)[0]);
  }
  return [...options].sort((a, b) => a - b);
}

export default {
  id: 'bst-builder',
  name: 'BST Builder',
  icon: '♧',
  color: '#90cc9a',
  tagline: 'Plant each new value in the forest: find its parent, then choose the left or right branch.',
  skills: 'Binary search trees · insertion · height',
  start(host, api) {
    let alive = true;
    let timer = null;
    let world = null;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
      return id;
    };

    const state = {};
    let update = () => {};
    let incomingValue, timerHolder, canvas, chipRow, sideBox, quizHolder, hint;

    function reset() {
      Object.assign(state, {
        score: 0,
        streak: 0,
        bestStreak: 0,
        hits: 0,
        total: 0,
        round: 0,
        k: 0,
        roundValues: [],
        values: [],
        marked: [],
        selected: null,
        awaiting: false,
        quiz: null,
        fraction: 1,
        lastTick: 0,
      });
    }

    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (state.quiz) {
        const index = OPTION_KEYS[e.key.toLowerCase()];
        if (index === undefined || index >= state.quiz.buttons.length) return;
        e.preventDefault();
        pickOption(index);
        return;
      }
      if (!state.awaiting) return;
      if (e.key === 'ArrowLeft') chooseSide('left');
      else if (e.key === 'ArrowRight') chooseSide('right');
      else return;
      e.preventDefault();
    };

    function showIntro() {
      intro(host, {
        title: 'BST Builder',
        text:
          'Values arrive one at a time. Walk the tree in your head: smaller goes left, larger goes right. ' +
          'Click the node that becomes the parent (in the scene or in the NODES row), then choose LEFT or RIGHT, or press the arrow keys. ' +
          `Right parent and side: +${CORRECT} plus up to +${SPEED_BONUS} for speed. A miss costs ${PENALTY} and the value is planted for you. ` +
          `Three rounds of seven values, each ending with a height question worth +${QUIZ_BONUS}.`,
        onStart: begin,
      });
    }

    function begin() {
      reset();
      world?.destroy();
      host.replaceChildren();
      update = hud(host, [
        { id: 'score', label: 'SCORE' },
        { id: 'round', label: 'ROUND' },
        { id: 'streak', label: 'STREAK' },
      ]);
      incomingValue = el('b', { text: '' });
      timerHolder = el('div');
      canvas = el('canvas', {
        class: 'game-canvas',
        tabindex: '0',
        'aria-label': 'Binary search tree scene',
      });
      chipRow = el('div', { class: 'queue-row' });
      sideBox = el(
        'div',
        { class: 'game-options' },
        el(
          'button',
          { class: 'answer', type: 'button', onclick: () => chooseSide('left') },
          el('span', { text: '←' }),
          'LEFT'
        ),
        el(
          'button',
          { class: 'answer', type: 'button', onclick: () => chooseSide('right') },
          el('span', { text: '→' }),
          'RIGHT'
        )
      );
      quizHolder = el('div');
      hint = el('p', { class: 'game-prompt', text: '' });
      host.append(
        el('div', { class: 'incoming' }, 'INCOMING', incomingValue),
        timerHolder,
        canvas,
        chipRow,
        sideBox,
        quizHolder,
        hint
      );
      world = new VoxelWorld(canvas, { interactive: true, onInspect: hit => pickParent(hit.index) });
      document.addEventListener('keydown', onKey);
      startRound();
    }

    function refreshHud() {
      update({ score: state.score, round: `${state.round + 1}/${ROUNDS}`, streak: state.streak });
    }

    function frame() {
      return {
        values: [...state.values],
        nodes: makeTree(state.values),
        active: state.selected === null ? [] : [state.selected],
        marked: [...state.marked],
        discarded: [],
      };
    }

    function redraw() {
      const f = frame();
      world.set({ topic: 'tree', terrain: 'forest', view: 'tree', algorithm: 'bstInsert', frame: f });
      chipRow.replaceChildren(
        el('small', { text: 'NODES' }),
        ...f.nodes.map(n =>
          el('button', {
            class: `big-chip${n.id === state.selected ? ' active' : ''}`,
            type: 'button',
            text: n.value,
            onclick: () => pickParent(n.id),
          })
        )
      );
    }

    function startRound() {
      state.roundValues = pickValues(Math.random);
      state.values = [state.roundValues[0]];
      state.marked = [0];
      state.selected = null;
      state.k = 1;
      sideBox.hidden = true;
      incomingValue.textContent = '';
      timerHolder.replaceChildren();
      hint.textContent = `Round ${state.round + 1}: ${state.roundValues[0]} is the root. Six more values are on their way.`;
      redraw();
      refreshHud();
      sound.place();
      later(present, 1300);
    }

    function present() {
      const value = state.roundValues[state.k];
      state.awaiting = true;
      state.selected = null;
      state.marked = [];
      state.fraction = 1;
      state.lastTick = SECONDS;
      incomingValue.textContent = value;
      sideBox.hidden = false;
      hint.textContent = `Where does ${value} go? Click its parent node, then choose LEFT or RIGHT.`;
      redraw();
      timer = countdown(
        SECONDS,
        (left, fraction) => {
          state.fraction = fraction;
          const whole = Math.ceil(left);
          if (whole <= 3 && whole < state.lastTick) {
            state.lastTick = whole;
            sound.tick();
          }
        },
        () => resolve(null, null)
      );
      timerHolder.replaceChildren(timer.bar);
      sound.step(state.k);
    }

    function pickParent(id) {
      if (!state.awaiting || id === null || id === undefined) return;
      const node = makeTree(state.values)[id];
      if (!node) return;
      state.selected = id;
      sound.step(id);
      hint.textContent = `Parent ${node.value} selected. Does ${state.roundValues[state.k]} go LEFT or RIGHT?`;
      redraw();
    }

    function chooseSide(side) {
      if (!state.awaiting) return;
      if (state.selected === null) {
        hint.textContent = 'Pick the parent node first, then choose a side.';
        sound.tick();
        return;
      }
      resolve(state.selected, side);
    }

    function resolve(parent, side) {
      if (!state.awaiting) return;
      state.awaiting = false;
      timer?.stop();
      const value = state.roundValues[state.k];
      const expected = insertParent(state.values, value);
      const ok = parent === expected.parentIndex && side === expected.side;
      const why = explainInsert(state.values, value);
      state.total++;
      if (ok) {
        const bonus = Math.round(SPEED_BONUS * state.fraction);
        state.score += CORRECT + bonus;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.hits++;
        sound.correct();
        hint.textContent = `+${CORRECT + bonus}. ${why}`;
      } else {
        state.score = Math.max(0, state.score - PENALTY);
        state.streak = 0;
        sound.wrong();
        const lead = parent === null ? 'Out of time.' : 'Not quite.';
        hint.textContent = `${lead} ${why} Lost ${PENALTY}.`;
      }
      state.values.push(value);
      state.selected = expected.parentIndex;
      state.marked = [state.values.length - 1];
      sideBox.hidden = true;
      redraw();
      refreshHud();
      sound.place();
      later(next, ok ? 900 : 2200);
    }

    function next() {
      state.k++;
      if (state.k < state.roundValues.length) return present();
      bonusQuestion();
    }

    function bonusQuestion() {
      state.selected = null;
      state.marked = [];
      incomingValue.textContent = '';
      timerHolder.replaceChildren();
      redraw();
      const height = treeHeight(makeTree(state.values));
      const options = heightOptions(height, Math.random);
      const box = optionButtons(
        options.map(o => `Height ${o}`),
        i => pickOption(i)
      );
      state.quiz = { height, correct: options.indexOf(height), buttons: [...box.children] };
      quizHolder.replaceChildren(box);
      hint.textContent = `Bonus: what is the height of this tree? Count levels, so a lone root has height 1. Press 1 to 4 or A to D. +${QUIZ_BONUS}.`;
    }

    function pickOption(index) {
      if (!state.quiz) return;
      const { height, correct, buttons } = state.quiz;
      state.quiz = null;
      const ok = index === correct;
      flash(buttons[index], ok);
      if (!ok) flash(buttons[correct], true);
      if (ok) state.score += QUIZ_BONUS;
      hint.textContent = ok
        ? `+${QUIZ_BONUS}. The height is ${height}: the longest root-to-leaf path has ${height} levels.`
        : `The height is ${height}: the longest root-to-leaf path has ${height} levels.`;
      refreshHud();
      later(() => {
        quizHolder.replaceChildren();
        state.round++;
        if (state.round < ROUNDS) startRound();
        else finish();
      }, 1600);
    }

    function finish() {
      document.removeEventListener('keydown', onKey);
      timer?.stop();
      world?.destroy();
      world = null;
      const score = state.score;
      gameOver(host, {
        gameId: 'bst-builder',
        score,
        summary: `${state.hits} of ${state.total} values were planted on the right branch first time. Best streak: ${state.bestStreak}.`,
        onReplay: begin,
      });
      api?.onScore?.(score);
    }

    showIntro();
    return {
      destroy() {
        alive = false;
        for (const id of timers) clearTimeout(id);
        timers.clear();
        timer?.stop();
        document.removeEventListener('keydown', onKey);
        world?.destroy();
        world = null;
      },
    };
  },
};
