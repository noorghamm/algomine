// Pseudocode Forge: the pseudocode of a lesson is scattered. Hammer the lines back into
// order, then fill the missing token in a single line. Pure helpers live at the top so
// tests can import them; everything that touches the DOM lives inside start().
import { el, shuffle, pick } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { recordForge } from '../progress.mjs';
import { lessons, topics } from '../algorithms.mjs';
import { intro, hud, countdown, gameOver, optionButtons, flash } from './common.mjs';

export const ROUND_PLAN = ['order', 'order', 'order', 'order', 'fill', 'fill'];
export const ORDER_SECONDS = 90;
export const FILL_SECONDS = 25;

// ---------- pure helpers ----------

const MINUS = '−';

export const shuffleWith = (list, rng = Math.random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const pickWith = (list, rng) => list[Math.floor(rng() * list.length)];

// Curated distractor pools. A blanked word is offered with three other words from its pool.
const WORD_POOLS = [
  ['left', 'right', 'mid', 'top'],
  ['lo', 'hi', 'pivot', 'boundary'],
  ['push', 'pop', 'enqueue', 'dequeue', 'peek'],
  ['queue', 'stack', 'heap', 'list'],
  ['null', 'head', 'tail', 'root'],
  ['largest', 'smallest', 'parent', 'child'],
  ['next', 'previous', 'current', 'first'],
  ['min', 'max', 'sum', 'count'],
  ['floor', 'ceil', 'round', 'abs'],
  ['mod', 'div', 'xor', 'pow'],
  ['empty', 'full', 'sorted', 'done'],
  ['append', 'prepend', 'insert', 'remove'],
  ['swap', 'copy', 'move', 'drop'],
  ['visit', 'skip', 'mark', 'settle'],
  ['target', 'value', 'index', 'key'],
];
const WORD_POOL = new Map();
for (const pool of WORD_POOLS) for (const word of pool) if (!WORD_POOL.has(word)) WORD_POOL.set(word, pool);

const COMPARE_OPS = ['<', '<=', '>', '>=', '==', '!='];
const ARITH_OPS = ['+', MINUS, '*', '/'];
const ASSIGN_OPS = ['+=', `${MINUS}=`, '*=', '='];

const fromPool = (pool, answer, rng) =>
  shuffleWith(
    pool.filter(x => x !== answer),
    rng
  ).slice(0, 3);

function numberDistractors(n) {
  const out = [];
  for (const c of [n + 1, n - 1, n + 2, n - 2, n + 3, n * 2, n + 10, 0])
    if (c >= 0 && c !== n && !out.includes(c) && out.length < 3) out.push(c);
  return out.map(String);
}

// a[i + 1] -> a[i], a[i − 1], a[i + 2]
function indexDistractors(name, variable, op, amount) {
  const offset = op ? (op === '+' ? 1 : -1) * Number(amount) : 0;
  const format = o =>
    o === 0 ? `${name}[${variable}]` : `${name}[${variable} ${o > 0 ? '+' : MINUS} ${Math.abs(o)}]`;
  return [offset + 1, offset - 1, offset + 2].map(format);
}

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every blankable token in a line: { start, answer, distractors(rng) }.
function findGaps(line) {
  const found = [];
  const occurrences = answer => (line.match(new RegExp(escapeRegExp(answer), 'g')) || []).length;
  const consider = (start, answer, distractors) => {
    if (occurrences(answer) !== 1) return;
    found.push({ start, answer, distractors });
  };
  for (const m of line.matchAll(/<=|>=|==|!=|<|>/g))
    consider(m.index, m[0], rng => fromPool(COMPARE_OPS, m[0], rng));
  for (const m of line.matchAll(/[+−]=/g)) consider(m.index, m[0], rng => fromPool(ASSIGN_OPS, m[0], rng));
  for (const m of line.matchAll(/(?<= )[+−*/](?= )/g))
    consider(m.index, m[0], rng => fromPool(ARITH_OPS, m[0], rng));
  for (const m of line.matchAll(/\b\d+\b/g)) {
    const distractors = numberDistractors(Number(m[0]));
    if (distractors.length === 3) consider(m.index, m[0], () => distractors);
  }
  for (const m of line.matchAll(/\b([a-zA-Z]\w*)\[(\w+)(?: ([+−]) (\d+))?\](?!\[)/g))
    consider(m.index, m[0], () => indexDistractors(m[1], m[2], m[3], m[4]));
  for (const m of line.matchAll(/\b[a-zA-Z]+\b/g)) {
    const pool = WORD_POOL.get(m[0]);
    if (pool) consider(m.index, m[0], rng => fromPool(pool, m[0], rng));
  }
  return found;
}

// Blank one meaningful token of a pseudocode line. Returns null when the line has none.
export function makeGap(line, rng = Math.random) {
  const gaps = findGaps(line);
  if (!gaps.length) return null;
  const gap = pickWith(gaps, rng);
  const distractors = gap.distractors(rng).filter(d => d !== gap.answer);
  if (new Set(distractors).size < 3) return null;
  return {
    before: line.slice(0, gap.start),
    answer: gap.answer,
    after: line.slice(gap.start + gap.answer.length),
    options: shuffleWith([gap.answer, ...distractors.slice(0, 3)], rng),
  };
}

// Shuffle line indices so the visible order differs from the original.
export function scramble(lines, rng = Math.random) {
  const indices = lines.map((_, i) => i);
  if (lines.length < 2) return indices;
  for (let attempt = 0; attempt < 30; attempt++) {
    const order = shuffleWith(indices, rng);
    if (order.some((lineIndex, slot) => lines[lineIndex] !== lines[slot])) return order;
  }
  return [...indices.slice(1), indices[0]];
}

// 100 base, 15 off per wrong line on every check, up to 50 for finishing inside 60 seconds.
export function orderScore(wrongLines, seconds) {
  const base = Math.max(0, 100 - 15 * wrongLines);
  const bonus = seconds < 60 ? Math.round(50 * (1 - seconds / 60)) : 0;
  return base + bonus;
}

// 60 on the first try, 30 on the second, nothing after that; up to 20 for speed.
export function fillScore(attempts, seconds) {
  const base = attempts === 1 ? 60 : attempts === 2 ? 30 : 0;
  if (!base) return 0;
  return base + Math.round(20 * Math.max(0, 1 - seconds / FILL_SECONDS));
}

// Pick a line of the lesson that has a blankable token.
export function fillPuzzle(lesson, rng = Math.random) {
  for (const index of shuffleWith(
    lesson.code.map((_, i) => i),
    rng
  )) {
    const gap = makeGap(lesson.code[index], rng);
    if (gap) return { lesson, index, line: lesson.code[index], ...gap };
  }
  return null;
}

// ---------- the game ----------

export default {
  id: 'forge',
  name: 'Pseudocode Forge',
  icon: '⚒',
  color: '#f3a86b',
  tagline: 'The pseudocode is scattered across the anvil. Hammer every line back into place.',
  skills: 'Pseudocode · every lesson',
  start(host, api) {
    let world = 'any';
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
    const pool = () => {
      const list = world === 'any' ? lessons : lessons.filter(l => l.topic === world);
      return list.length ? list : lessons;
    };

    function showIntro() {
      stopTimer();
      setKeys(null);
      const select = el(
        'select',
        { 'aria-label': 'World', onchange: e => (world = e.target.value) },
        el('option', { value: 'any', text: 'Any world' }),
        ...topics
          .filter(t => t.algorithms.length)
          .map(t => el('option', { value: t.id, text: `${t.icon} ${t.name}` }))
      );
      select.value = world;
      intro(host, {
        title: 'Pseudocode Forge',
        text:
          `${ROUND_PLAN.length} rounds. In an ORDER round the lines of a lesson are scrambled: click a line to drop it into ` +
          'the next empty slot, click a slot to send a line back, then CHECK. Correct lines lock in, wrong ones ' +
          'bounce back and cost 15 points each. In a FILL round one token is missing from a single line: pick the ' +
          'right one from four. Finish fast for a time bonus.',
        extra: el('p', { class: 'game-field' }, el('label', {}, 'Forge lessons from ', select)),
        onStart: startRun,
      });
    }

    function startRun() {
      state = { round: 0, score: 0, plan: shuffle(ROUND_PLAN), results: [] };
      nextRound();
    }

    function nextRound() {
      stopTimer();
      setKeys(null);
      if (state.round >= state.plan.length) return finish();
      if (state.plan[state.round] === 'order') orderRound();
      else fillRound();
    }

    // Shared frame: HUD, timer bar, a prompt. Returns the board container and the HUD updater.
    function frame(seconds, onTimeout) {
      host.replaceChildren();
      const update = hud(host, [
        { id: 'round', label: 'ROUND' },
        { id: 'score', label: 'SCORE' },
        { id: 'time', label: 'TIME' },
      ]);
      update({ round: `${state.round + 1}/${state.plan.length}`, score: state.score, time: seconds });
      let lastWhole = seconds;
      timer = countdown(
        seconds,
        left => {
          const whole = Math.ceil(left);
          if (whole !== lastWhole) {
            lastWhole = whole;
            update({ time: whole });
            if (whole <= 5 && whole > 0) sound.tick();
          }
        },
        () => {
          if (!dead) onTimeout();
        }
      );
      host.append(timer.bar);
      const board = el('div', { class: 'game-board' });
      host.append(board);
      return { board, update };
    }

    function recordRound(lesson, kind, score, perfect) {
      state.score += score;
      state.results.push({ lesson, kind, score, perfect });
      state.round++;
      if (kind === 'order') recordForge(lesson.id, score);
    }

    function orderRound() {
      const lesson = pick(pool());
      const lines = lesson.code;
      const pieces = scramble(lines).map((lineIndex, id) => ({ id, text: lines[lineIndex] }));
      const slots = Array(lines.length).fill(null);
      const locked = new Set();
      let selected = null;
      let busy = false;
      let wrongTotal = 0;
      let wrongNow = [];
      const started = performance.now();
      const elapsed = () => (performance.now() - started) / 1000;

      const { board, update } = frame(ORDER_SECONDS, () => {
        busy = true;
        setKeys(null);
        for (let i = 0; i < slots.length; i++) {
          slots[i] = pieces.findIndex(p => p.text === lines[i] && !slots.slice(0, i).includes(p.id));
          locked.add(i);
        }
        render();
        note.textContent = 'Out of time. This is the real order.';
        recordRound(lesson, 'order', 0, false);
        later(nextRound, 2000);
      });

      const slotBox = el('div', { class: 'code-puzzle', role: 'list' });
      const pieceBox = el('div', { class: 'code-pieces', role: 'list' });
      const note = el('p', { class: 'ask-help', text: 'Rebuild the pseudocode from top to bottom.' });
      const check = el('button', { class: 'primary', type: 'button', onclick: doCheck }, 'CHECK ORDER');
      board.append(
        el(
          'p',
          { class: 'game-prompt' },
          el('strong', { text: lesson.name }),
          el('br'),
          el('small', { text: lesson.intro })
        ),
        slotBox,
        pieceBox,
        note,
        el('div', { class: 'game-actions' }, check)
      );

      function render() {
        const filled = slots.every(s => s !== null);
        slotBox.replaceChildren(
          ...slots.map((pieceId, i) => {
            const classes = ['code-slot'];
            if (pieceId === null) classes.push('empty');
            if (locked.has(i)) classes.push('correct');
            if (wrongNow.includes(i)) classes.push('wrong');
            if (selected === i) classes.push('code-piece', 'selected');
            return el(
              'button',
              {
                class: classes.join(' '),
                type: 'button',
                role: 'listitem',
                'aria-label': `Slot ${i + 1}${pieceId === null ? ', empty' : ''}`,
                onclick: () => clickSlot(i),
              },
              el('b', { text: i + 1 }),
              el('span', { text: pieceId === null ? '(empty)' : pieces[pieceId].text })
            );
          })
        );
        pieceBox.replaceChildren(
          ...pieces
            .filter(p => !slots.includes(p.id))
            .map(p =>
              el(
                'button',
                { class: 'code-piece', type: 'button', role: 'listitem', onclick: () => clickPiece(p.id) },
                el('span', { text: p.text })
              )
            )
        );
        check.disabled = !filled || busy;
      }

      function clickPiece(id) {
        if (busy) return;
        const target = slots.indexOf(null);
        if (target < 0) return;
        slots[target] = id;
        selected = target;
        sound.place();
        render();
      }

      function clickSlot(i) {
        if (busy || locked.has(i)) return;
        if (slots[i] === null) {
          if (selected === null || slots[selected] === null) return;
          slots[i] = slots[selected];
          slots[selected] = null;
          selected = i;
          sound.place();
        } else {
          slots[i] = null;
          selected = null;
          sound.mine();
        }
        render();
      }

      function doCheck() {
        if (busy || slots.some(s => s === null)) return;
        wrongNow = [];
        slots.forEach((pieceId, i) => {
          if (locked.has(i)) return;
          if (pieces[pieceId].text === lines[i]) locked.add(i);
          else wrongNow.push(i);
        });
        wrongTotal += wrongNow.length;
        selected = null;
        if (!wrongNow.length) {
          busy = true;
          stopTimer();
          setKeys(null);
          const seconds = elapsed();
          const score = orderScore(wrongTotal, seconds);
          recordRound(lesson, 'order', score, wrongTotal === 0);
          render();
          update({ score: state.score });
          note.textContent =
            wrongTotal === 0
              ? `Forged in one go! +${score}`
              : `Forged after ${wrongTotal} wrong lines. +${score}`;
          sound.correct();
          later(nextRound, 1400);
          return;
        }
        busy = true;
        sound.wrong();
        note.textContent = `${wrongNow.length} line${wrongNow.length === 1 ? ' is' : 's are'} out of place. They go back to the pile.`;
        render();
        later(() => {
          for (const i of wrongNow) slots[i] = null;
          wrongNow = [];
          busy = false;
          render();
        }, 800);
      }

      setKeys(e => {
        if (e.key === 'Enter' && !check.disabled) {
          e.preventDefault();
          doCheck();
          return;
        }
        if (e.key === 'Escape') {
          selected = null;
          render();
          return;
        }
        const n = Number(e.key);
        if (!Number.isInteger(n) || n < 1 || n > slots.length) return;
        e.preventDefault();
        const i = n - 1;
        if (busy || locked.has(i)) return;
        if (slots[i] === null && selected !== null && slots[selected] !== null) clickSlot(i);
        else if (slots[i] === null) {
          const free = pieces.find(p => !slots.includes(p.id));
          if (!free) return;
          slots[i] = free.id;
          selected = i;
          sound.place();
          render();
        } else clickSlot(i);
      });
      render();
    }

    function fillRound() {
      let puzzle = null;
      for (let attempt = 0; attempt < 12 && !puzzle; attempt++) puzzle = fillPuzzle(pick(pool()));
      for (const lesson of lessons) if (!puzzle) puzzle = fillPuzzle(lesson);
      if (!puzzle) return nextRound();
      const { lesson, index, answer, options } = puzzle;
      let attempts = 0;
      let done = false;
      const started = performance.now();
      const buttons = () => [...optionBox.querySelectorAll('button')];

      const { board, update } = frame(FILL_SECONDS, () => {
        done = true;
        setKeys(null);
        reveal();
        note.textContent = `Out of time. The missing token was ${answer}.`;
        recordRound(lesson, 'fill', 0, false);
        later(nextRound, 2000);
      });

      const gapSpan = el('span', { class: 'code-gap', text: '?' });
      const note = el('p', { class: 'ask-help', text: 'Press 1 to 4 or click an option.' });
      const optionBox = optionButtons(options, (i, button) => {
        if (done) return;
        attempts++;
        if (options[i] === answer) {
          done = true;
          stopTimer();
          setKeys(null);
          flash(button, true);
          gapSpan.textContent = answer;
          const score = fillScore(attempts, (performance.now() - started) / 1000);
          recordRound(lesson, 'fill', score, attempts === 1);
          update({ score: state.score });
          note.textContent = score ? `Well struck. +${score}` : 'Found it, but no points after two misses.';
          later(nextRound, 1200);
        } else {
          flash(button, false);
          button.disabled = true;
          note.textContent =
            attempts === 1 ? 'Not that one. Half points still on the table.' : 'Keep looking.';
        }
      });
      const reveal = () => {
        gapSpan.textContent = answer;
        for (const [i, b] of buttons().entries()) if (options[i] === answer) b.classList.add('correct');
      };

      board.append(
        el(
          'p',
          { class: 'game-prompt' },
          el('strong', { text: lesson.name }),
          el('br'),
          el('small', { text: 'Which token belongs in the gap?' })
        ),
        el(
          'div',
          { class: 'code-puzzle' },
          el(
            'div',
            { class: 'code-slot' },
            el('b', { text: index + 1 }),
            el('span', {}, puzzle.before, gapSpan, puzzle.after)
          )
        ),
        optionBox,
        note
      );

      setKeys(e => {
        const key = e.key.toLowerCase();
        const i = /^[1-4]$/.test(key) ? Number(key) - 1 : /^[a-d]$/.test(key) ? key.charCodeAt(0) - 97 : -1;
        if (i < 0) return;
        e.preventDefault();
        const button = buttons()[i];
        if (button && !button.disabled) button.click();
      });
    }

    function finish() {
      const { results, score } = state;
      const perfect = results.filter(r => r.perfect).length;
      const best = results.reduce((top, r) => (r.score > (top?.score ?? 0) ? r : top), null);
      const summary =
        `${perfect} of ${results.length} rounds perfect. ` +
        (best ? `Best lesson: ${best.lesson.name}.` : 'The forge is patient. Try again.');
      gameOver(host, { gameId: 'forge', score, summary, onReplay: showIntro });
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
