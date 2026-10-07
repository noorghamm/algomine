// Path Race: predict which node BFS, DFS and Dijkstra reach next on the Pathfinder Valley map.
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { simulate, definitions } from '../algorithms.mjs';
import { VoxelWorld } from '../world.mjs';
import { intro, hud, countdown, gameOver } from './common.mjs';

export const ROUNDS = ['bfs', 'dfs', 'dijkstra'];
const MAP = [1, 2, 3, 4, 5, 6, 7];
const SECONDS = 8;
const CORRECT = 60;
const SPEED_BONUS = 40;
const PENALTY = 20;
const STEP_MS = 650;

// Every frame where a new node joins `marked`: { frameIndex, nodeId }, in frame order.
export function decisionPoints(frames) {
  const out = [];
  for (let i = 1; i < frames.length; i++) {
    const before = frames[i - 1].marked?.length || 0;
    const marked = frames[i].marked || [];
    if (marked.length > before) out.push({ frameIndex: i, nodeId: marked[marked.length - 1] });
  }
  return out;
}

// Trays to show under the scene: the lesson's own trays, or its aux list as the queue or stack.
export function traysOf(frame, algorithm) {
  if (Array.isArray(frame.trays) && frame.trays.length)
    return frame.trays.map(t => ({ label: t.label, values: [...(t.values || [])] }));
  return [{ label: algorithm === 'dfs' ? 'STACK' : 'QUEUE', values: [...(frame.aux || [])] }];
}

export const questionFor = algorithm =>
  algorithm === 'dijkstra' ? 'Which node is settled next?' : 'Which node is visited next?';

export default {
  id: 'path-race',
  name: 'Path Race',
  icon: '⌘',
  color: '#8ec9e1',
  tagline:
    'Read the queue, the stack and the frontier, then call the next node before the search gets there.',
  skills: 'BFS · DFS · Dijkstra',
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
    let question, timerHolder, canvas, trayBox, sceneHint;

    function reset() {
      Object.assign(state, {
        score: 0,
        streak: 0,
        bestStreak: 0,
        hits: 0,
        total: 0,
        round: 0,
        algorithm: ROUNDS[0],
        frames: [],
        points: [],
        pi: 0,
        fi: 0,
        awaiting: false,
        fraction: 1,
        lastTick: 0,
      });
    }

    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || !state.awaiting) return;
      if (!/^[1-7]$/.test(e.key)) return;
      e.preventDefault();
      answer(Number(e.key) - 1);
    };

    function showIntro() {
      intro(host, {
        title: 'Path Race',
        text:
          'Three rounds on the same seven-node map: breadth-first search, depth-first search, then Dijkstra. ' +
          'Watch the queue, the stack or the frontier under the scene. Each time the search is about to visit or settle a node, ' +
          'click that node in the scene (or press 1 to 7). ' +
          `Right node: +${CORRECT} plus up to +${SPEED_BONUS} for speed. Wrong node: -${PENALTY}, and the search carries on.`,
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
      question = el('p', { class: 'game-prompt', text: '' });
      timerHolder = el('div');
      canvas = el('canvas', { class: 'game-canvas', tabindex: '0', 'aria-label': 'Graph scene' });
      trayBox = el('div');
      sceneHint = el('p', { class: 'scene-hint', text: '' });
      const nodeRow = el(
        'div',
        { class: 'queue-row' },
        el('small', { text: 'NODES' }),
        ...MAP.map((n, i) =>
          el('button', { class: 'big-chip', type: 'button', text: n, onclick: () => answer(i) })
        )
      );
      host.append(question, timerHolder, canvas, sceneHint, trayBox, nodeRow);
      world = new VoxelWorld(canvas, { interactive: true, onInspect: hit => answer(hit.index) });
      document.addEventListener('keydown', onKey);
      startRound();
    }

    function refreshHud() {
      update({ score: state.score, round: `${state.round + 1}/${ROUNDS.length}`, streak: state.streak });
    }

    function show(index, extra = {}) {
      const frame = { ...state.frames[index], ...extra };
      world.set({ topic: 'graph', terrain: 'water', view: 'graph', algorithm: state.algorithm, frame });
      sceneHint.textContent = frame.message || '';
      trayBox.replaceChildren(
        ...traysOf(frame, state.algorithm).map(t =>
          el(
            'div',
            { class: 'queue-row' },
            el('small', { text: t.label }),
            ...(t.values.length
              ? t.values.map(v => el('span', { class: 'big-chip', text: v }))
              : [el('span', { class: 'big-chip ghost', text: '·' })])
          )
        )
      );
    }

    function startRound() {
      state.algorithm = ROUNDS[state.round];
      state.frames = simulate(state.algorithm, MAP);
      state.points = decisionPoints(state.frames);
      state.pi = 0;
      state.fi = 0;
      state.awaiting = false;
      timerHolder.replaceChildren();
      question.textContent = `Round ${state.round + 1}: ${definitions[state.algorithm].name}.`;
      show(0);
      refreshHud();
      later(step, 1300);
    }

    function step() {
      const nextPoint = state.points[state.pi];
      if (nextPoint && nextPoint.frameIndex === state.fi + 1) return ask();
      if (state.fi + 1 < state.frames.length) {
        state.fi++;
        show(state.fi);
        later(step, STEP_MS);
        return;
      }
      endRound();
    }

    function ask() {
      state.awaiting = true;
      state.fraction = 1;
      state.lastTick = SECONDS;
      question.textContent = `${questionFor(state.algorithm)} Click it in the scene or press 1 to 7.`;
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
        () => answer(null)
      );
      timerHolder.replaceChildren(timer.bar);
      sound.step(state.pi);
    }

    function answer(nodeId) {
      if (!state.awaiting) return;
      state.awaiting = false;
      timer?.stop();
      timerHolder.replaceChildren();
      const expected = state.points[state.pi].nodeId;
      const verb = state.algorithm === 'dijkstra' ? 'settled' : 'visited';
      const ok = nodeId === expected;
      state.total++;
      if (ok) {
        const bonus = Math.round(SPEED_BONUS * state.fraction);
        state.score += CORRECT + bonus;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.hits++;
        sound.correct();
        question.textContent = `+${CORRECT + bonus}. Node ${expected + 1} is ${verb} next.`;
      } else {
        state.score = Math.max(0, state.score - PENALTY);
        state.streak = 0;
        sound.wrong();
        show(state.fi, { active: [expected] });
        const lead = nodeId === null ? 'Out of time.' : `Not node ${nodeId + 1}.`;
        question.textContent = `${lead} Node ${expected + 1} is ${verb} next. Lost ${PENALTY}.`;
      }
      refreshHud();
      later(
        () => {
          state.pi++;
          state.fi++;
          show(state.fi);
          later(step, STEP_MS);
        },
        ok ? 500 : 1500
      );
    }

    function endRound() {
      question.textContent = `${definitions[state.algorithm].name} complete.`;
      state.round++;
      if (state.round < ROUNDS.length) later(startRound, 1400);
      else finish();
    }

    function finish() {
      document.removeEventListener('keydown', onKey);
      timer?.stop();
      world?.destroy();
      world = null;
      const score = state.score;
      gameOver(host, {
        gameId: 'path-race',
        score,
        summary: `${state.hits} of ${state.total} next nodes called correctly. Best streak: ${state.bestStreak}.`,
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
