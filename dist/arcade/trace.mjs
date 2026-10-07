// Trace Trial: run a lesson in your head. After step k, what does the world look like,
// and how many comparisons has the algorithm made? Pure helpers sit at the top for tests;
// DOM code lives inside start().
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { definitions, topics, simulate } from '../algorithms.mjs';
import { intro, hud, countdown, gameOver, optionButtons, flash } from './common.mjs';

export const QUESTIONS = 8;
export const SECONDS = 30;
export const STREAK_FOR_BONUS = 3;
export const STREAK_MULTIPLIER = 1.5;
const TOPIC_IDS = ['sorting', 'search', 'stack', 'list', 'heap'];
const TARGET_LABEL = {
  linear: 'TARGET',
  binary: 'TARGET',
  listDelete: 'DELETE',
  heapInsert: 'INSERT',
  listInsert: 'POSITION',
};

// ---------- pure helpers ----------

export const shuffleWith = (list, rng = Math.random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const pickWith = (list, rng) => list[Math.floor(rng() * list.length)];
const key = values => JSON.stringify(values);

// Lessons whose worlds are plain numbers: sorting, searching, stacks and queues, lists, heaps.
export function traceLessons() {
  return topics
    .filter(t => TOPIC_IDS.includes(t.id))
    .flatMap(t => t.algorithms)
    .map(id => definitions[id])
    .filter(l => l && (!l.inputKind || l.inputKind === 'numbers'));
}

export const randomInput = (rng = Math.random) =>
  Array.from({ length: 5 + Math.floor(rng() * 2) }, () => 1 + Math.floor(rng() * 20));

// For search lessons the target sits in the array two thirds of the time.
export function pickTarget(lesson, input, rng = Math.random) {
  if (lesson.id === 'listInsert') return Math.floor(rng() * (input.length + 1));
  if (rng() < 2 / 3) return pickWith(input, rng);
  return 1 + Math.floor(rng() * 20);
}

// A frame index between 2 and frames.length - 2, clamped for very short runs.
export function pickFrameIndex(frames, rng = Math.random) {
  const last = frames.length - 1;
  if (last < 0) return 0;
  const lo = Math.min(2, last);
  const hi = Math.max(lo, last - 1);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Three value arrays that differ from the truth and from each other: other frames of the
// same run, swaps of two elements of the truth, then nudged copies as a last resort.
export function makeDistractors(truth, frames, rng = Math.random) {
  const seen = new Set([key(truth)]);
  const out = [];
  const add = candidate => {
    if (out.length >= 3 || !Array.isArray(candidate)) return;
    const k = key(candidate);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(candidate);
  };
  const others = shuffleWith(frames.map(f => f.values).filter(Array.isArray), rng);
  const swaps = [];
  for (let i = 0; i < truth.length; i++)
    for (let j = i + 1; j < truth.length; j++)
      if (truth[i] !== truth[j]) {
        const c = [...truth];
        [c[i], c[j]] = [c[j], c[i]];
        swaps.push(c);
      }
  const swapped = shuffleWith(swaps, rng);
  for (let i = 0; i < Math.max(others.length, swapped.length) && out.length < 3; i++) {
    if (i < others.length) add(others[i]);
    if (i < swapped.length) add(swapped[i]);
  }
  for (let i = 0; out.length < 3 && i < 40; i++) {
    const c = [...truth];
    if (!c.length) c.push(i + 1);
    else {
      const at = i % c.length;
      const delta = (i % 2 ? 1 : -1) * (1 + Math.floor(i / c.length));
      c[at] = Math.max(1, Number(c[at]) + delta);
    }
    add(c);
  }
  return out;
}

// Four numeric options around the true comparison count, truth included.
export function makeCountOptions(truth, rng = Math.random) {
  const out = [];
  for (const c of [truth + 1, truth - 1, truth + 2, truth - 2, truth + 3, truth * 2, truth + 5])
    if (c >= 0 && c !== truth && !out.includes(c) && out.length < 3) out.push(c);
  return shuffleWith([truth, ...out], rng);
}

// Build one question of a kind ('values' or 'count'). Retries until the run is interesting.
export function makeQuestion(kind, rng = Math.random, pool = traceLessons()) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const lesson = pickWith(pool, rng);
    const input = randomInput(rng);
    const target = lesson.target ? pickTarget(lesson, input, rng) : undefined;
    const frames = simulate(lesson.id, input, target);
    if (frames.length < 5) continue;
    const k = pickFrameIndex(frames, rng);
    if (kind === 'values') {
      if (new Set(frames.map(f => key(f.values))).size < 4) continue;
      const truth = frames[k].values;
      const options = shuffleWith([truth, ...makeDistractors(truth, frames, rng)], rng);
      return {
        kind,
        lesson,
        input,
        target,
        frames,
        k,
        truth,
        options,
        answer: options.findIndex(o => key(o) === key(truth)),
      };
    }
    if (frames.at(-1).comparisons < 3 || frames[k].comparisons < 1) continue;
    const truth = frames[k].comparisons;
    const options = makeCountOptions(truth, rng);
    return { kind, lesson, input, target, frames, k, truth, options, answer: options.indexOf(truth) };
  }
  return null;
}

// Points for one question: 100 first try, 40 second try, speed bonus up to 50, doubled
// without hints, times 1.5 once the streak has reached three.
export function questionScore({ attempts, fraction, hints, streak }) {
  const base = attempts === 1 ? 100 : attempts === 2 ? 40 : 0;
  if (!base) return 0;
  const bonus = Math.round(50 * Math.max(0, Math.min(1, fraction)));
  const multiplier = (hints ? 1 : 2) * (streak >= STREAK_FOR_BONUS ? STREAK_MULTIPLIER : 1);
  return Math.round((base + bonus) * multiplier);
}

// ---------- the game ----------

export default {
  id: 'trace',
  name: 'Trace Trial',
  icon: '▸',
  color: '#8ec9e1',
  tagline: 'Run the algorithm in your head. Predict the world after step k.',
  skills: 'Mental tracing · sorting, search, stacks, lists, heaps',
  start(host, api) {
    let hints = true;
    let dead = false;
    let timer = null;
    let keyHandler = null;
    let state = null;
    const timeouts = new Set();

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timeouts.delete(id);
        if (!dead) fn();
      }, ms);
      timeouts.add(id);
    };
    const stopTimer = () => {
      timer?.stop();
      timer = null;
    };
    const typing = () =>
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;
    const setKeys = fn => {
      if (keyHandler) document.removeEventListener('keydown', keyHandler);
      keyHandler = fn
        ? e => {
            if (dead || typing() || e.metaKey || e.ctrlKey || e.altKey) return;
            fn(e);
          }
        : null;
      if (keyHandler) document.addEventListener('keydown', keyHandler);
    };

    const chips = (values, cls = '') =>
      el(
        'div',
        { class: 'queue-row' },
        ...(values.length
          ? values.map(v => el('span', { class: `big-chip ${cls}`.trim(), text: v }))
          : [el('span', { class: 'ask-help', text: '(empty)' })])
      );
    const valueText = values =>
      values.length
        ? el(
            'span',
            {},
            ...values.map(v => el('span', { class: 'value-chip', text: v, style: 'margin-right:4px' }))
          )
        : el('span', { text: '(empty)' });

    function showIntro() {
      stopTimer();
      setKeys(null);
      const box = el('input', { type: 'checkbox', onchange: e => (hints = e.target.checked) });
      box.checked = hints;
      intro(host, {
        title: 'Trace Trial',
        text:
          `${QUESTIONS} questions, ${SECONDS} seconds each. A lesson runs on a random input. You see the starting ` +
          'blocks and a step number, then pick the world after that step, or the number of comparisons made so far. ' +
          '100 points on the first try, 40 on the second, plus up to 50 for speed. Three right in a row and every ' +
          'answer after that is worth one and a half times as much.',
        extra: el(
          'p',
          { class: 'game-field' },
          el('label', {}, box, ' Show the step message as a hint (turn it off for double points)')
        ),
        onStart: startRun,
      });
    }

    function startRun() {
      state = { index: 0, score: 0, streak: 0, bestStreak: 0, firstTry: 0, correct: 0 };
      nextQuestion();
    }

    function nextQuestion() {
      stopTimer();
      setKeys(null);
      if (state.index >= QUESTIONS) return finish();
      const kind = state.index % 2 === 0 ? 'values' : 'count';
      const q = makeQuestion(kind) || makeQuestion(kind === 'values' ? 'count' : 'values');
      if (!q) return finish();
      ask(q);
    }

    function ask(q) {
      host.replaceChildren();
      const update = hud(host, [
        { id: 'q', label: 'QUESTION' },
        { id: 'score', label: 'SCORE' },
        { id: 'streak', label: 'STREAK' },
        { id: 'time', label: 'TIME' },
      ]);
      const streakText = () =>
        state.streak >= STREAK_FOR_BONUS ? `${state.streak} ×${STREAK_MULTIPLIER}` : String(state.streak);
      update({
        q: `${state.index + 1}/${QUESTIONS}`,
        score: state.score,
        streak: streakText(),
        time: SECONDS,
      });
      let fraction = 1;
      let lastWhole = SECONDS;
      let attempts = 0;
      let done = false;
      timer = countdown(
        SECONDS,
        (left, f) => {
          fraction = f;
          const whole = Math.ceil(left);
          if (whole !== lastWhole) {
            lastWhole = whole;
            update({ time: whole });
            if (whole <= 5 && whole > 0) sound.tick();
          }
        },
        () => {
          if (dead || done) return;
          done = true;
          setKeys(null);
          state.streak = 0;
          update({ streak: streakText() });
          reveal();
          note.textContent = 'Out of time. The highlighted answer is the real one.';
          later(advance, 2000);
        }
      );
      host.append(timer.bar);

      const start = q.frames[0].values;
      const showStart = Array.isArray(start) && start.length && key(start) !== key(q.input);
      const question =
        q.kind === 'values'
          ? `After step ${q.k}, what does the world look like?`
          : `How many comparisons has the algorithm made after step ${q.k}?`;
      const note = el('p', { class: 'ask-help', text: 'Press 1 to 4 or click an answer.' });
      const optionBox = optionButtons(
        q.options.map(o => (q.kind === 'values' ? valueText(o) : String(o))),
        (i, button) => {
          if (done) return;
          attempts++;
          if (i === q.answer) {
            done = true;
            stopTimer();
            setKeys(null);
            flash(button, true);
            const points = questionScore({ attempts, fraction, hints, streak: state.streak });
            state.score += points;
            state.correct++;
            if (attempts === 1) {
              state.firstTry++;
              state.streak++;
              state.bestStreak = Math.max(state.bestStreak, state.streak);
            }
            update({ score: state.score, streak: streakText() });
            note.replaceChildren(`+${points}. `);
            if (state.streak === STREAK_FOR_BONUS)
              note.append(el('span', { class: 'streak-pop', text: `STREAK ×${STREAK_MULTIPLIER} UNLOCKED` }));
            else if (state.streak > STREAK_FOR_BONUS)
              note.append(el('span', { class: 'streak-pop', text: `×${STREAK_MULTIPLIER} STREAK` }));
            later(advance, 1200);
          } else {
            flash(button, false);
            button.disabled = true;
            state.streak = 0;
            update({ streak: streakText() });
            if (attempts >= 2) {
              done = true;
              stopTimer();
              setKeys(null);
              reveal();
              note.textContent = 'Two misses. The highlighted answer is the real one.';
              later(advance, 2000);
            } else note.textContent = 'Not that one. One more try for 40 points.';
          }
        }
      );
      const reveal = () => {
        const buttons = optionBox.querySelectorAll('button');
        buttons[q.answer]?.classList.add('correct');
        for (const b of buttons) b.disabled = true;
      };

      const board = el(
        'div',
        { class: 'game-board' },
        el(
          'p',
          { class: 'game-prompt' },
          el('strong', { text: q.lesson.name }),
          el('br'),
          el('small', { text: q.lesson.intro })
        ),
        el('p', {
          class: 'ask-help',
          text:
            q.target === undefined ? 'INPUT' : `INPUT · ${TARGET_LABEL[q.lesson.id] || 'TARGET'} ${q.target}`,
        }),
        chips(q.input),
        showStart ? el('p', { class: 'ask-help', text: 'WORLD BEFORE STEP 1' }) : null,
        showStart ? chips(start) : null,
        el('p', { class: 'game-prompt', text: question }),
        hints ? el('p', { class: 'mine-hint', text: `Hint, step ${q.k}: ${q.frames[q.k].message}` }) : null,
        optionBox,
        note
      );
      host.append(board);

      function advance() {
        state.index++;
        nextQuestion();
      }

      setKeys(e => {
        const k = e.key.toLowerCase();
        const i = /^[1-4]$/.test(k) ? Number(k) - 1 : /^[a-d]$/.test(k) ? k.charCodeAt(0) - 97 : -1;
        if (i < 0) return;
        e.preventDefault();
        const button = optionBox.querySelectorAll('button')[i];
        if (button && !button.disabled) button.click();
      });
    }

    function finish() {
      const { score, firstTry, correct, bestStreak } = state;
      const summary =
        `${correct} of ${QUESTIONS} right, ${firstTry} on the first try. Longest streak: ${bestStreak}.` +
        (hints ? '' : ' Played without hints for double points.');
      gameOver(host, { gameId: 'trace', score, summary, onReplay: showIntro });
      api?.onScore?.(score);
    }

    showIntro();
    return {
      destroy() {
        dead = true;
        stopTimer();
        for (const id of timeouts) clearTimeout(id);
        timeouts.clear();
        setKeys(null);
      },
    };
  },
};
