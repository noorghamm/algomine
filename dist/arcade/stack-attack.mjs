// Stack Attack: predict what leaves a stack, a queue, or a deque before it happens, then judge a bracket string.
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { intro, hud, gameOver, optionButtons, flash } from './common.mjs';

export const KINDS = ['stack', 'queue', 'deque'];
export const DECISION_SECONDS = 6;
export const CORRECT_POINTS = 60;
export const SPEED_BONUS = 20;
export const WRONG_COST = 20;
export const BRACKET_POINTS = 80;

const INSERTS = { stack: ['push'], queue: ['enqueue'], deque: ['pushFront', 'pushBack'] };
const REMOVES = { stack: ['pop'], queue: ['dequeue'], deque: ['popFront', 'popBack'] };
const LABELS = {
  push: 'push',
  enqueue: 'enqueue',
  pushFront: 'push front',
  pushBack: 'push back',
  pop: 'pop',
  dequeue: 'dequeue',
  popFront: 'pop front',
  popBack: 'pop back',
};
export const STRUCTURE_NAMES = {
  stack: 'STACK (LIFO)',
  queue: 'QUEUE (FIFO)',
  deque: 'DEQUE',
  brackets: 'BRACKETS',
};
const ENDS = { stack: ['BOTTOM', 'TOP'], queue: ['FRONT', 'BACK'], deque: ['FRONT', 'BACK'] };

const rngPick = (rng, list) => list[Math.floor(rng() * list.length)];
const rngShuffle = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Apply one operation to `list` (front is index 0, back is the end). Returns the removed value, if any.
export function applyOp(list, op) {
  switch (op.type) {
    case 'push':
    case 'enqueue':
    case 'pushBack':
      list.push(op.value);
      return undefined;
    case 'pushFront':
      list.unshift(op.value);
      return undefined;
    case 'pop':
    case 'popBack':
      return list.pop();
    case 'dequeue':
    case 'popFront':
      return list.shift();
    default:
      throw new Error(`Unknown operation: ${op.type}`);
  }
}

export const labelOf = op => (op.value === undefined ? LABELS[op.type] : `${LABELS[op.type]} ${op.value}`);

// Pure: 8 to 12 operations with 3 to 5 removals. Every removal happens with at least two values stored,
// so each prediction is a real choice. Returns { kind, ops, removals } where removals lists the values
// that leave, in order. rng() returns [0, 1).
export function makeOps(rng, kind) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown structure: ${kind}`);
  for (let attempt = 0; attempt < 500; attempt++) {
    const total = 8 + Math.floor(rng() * 5);
    const wanted = Math.min(3 + Math.floor(rng() * 3), Math.floor((total - 1) / 2));
    const values = rngShuffle(
      rng,
      Array.from({ length: 20 }, (_, i) => i + 1)
    );
    const ops = [];
    let size = 0;
    let removed = 0;
    let next = 0;
    let ok = true;
    for (let i = 0; i < total; i++) {
      const left = total - i;
      const need = wanted - removed;
      let remove = false;
      if (need > 0) remove = need >= left || (size >= 2 && rng() < 0.45);
      if (remove && size < 2) {
        ok = false;
        break;
      }
      if (remove) {
        ops.push({ type: rngPick(rng, REMOVES[kind]), removes: true });
        size--;
        removed++;
      } else {
        ops.push({ type: rngPick(rng, INSERTS[kind]), value: values[next++], removes: false });
        size++;
      }
    }
    if (!ok || removed !== wanted) continue;
    const list = [];
    const removals = [];
    for (const op of ops) {
      op.label = labelOf(op);
      const out = applyOp(list, op);
      if (op.removes) removals.push(out);
    }
    return { kind, ops, removals };
  }
  throw new Error('Could not build an operation sequence');
}

const PAIR = { '(': ')', '[': ']', '{': '}' };
const OPENERS = Object.keys(PAIR);
const CLOSERS = Object.values(PAIR);

// Pure: true when every bracket closes the most recent unclosed opener. Other characters are skipped.
export function isBalanced(s) {
  const stack = [];
  for (const ch of String(s)) {
    if (OPENERS.includes(ch)) stack.push(ch);
    else if (CLOSERS.includes(ch)) {
      if (!stack.length || PAIR[stack.pop()] !== ch) return false;
    }
  }
  return stack.length === 0;
}

function balancedString(rng, pairs) {
  if (pairs <= 0) return '';
  const inner = Math.floor(rng() * pairs);
  const open = rngPick(rng, OPENERS);
  return open + balancedString(rng, inner) + PAIR[open] + balancedString(rng, pairs - 1 - inner);
}

// Pure: a bracket string of length 8, 10 or 12. When balancedWanted is false one character is
// changed so the string is no longer balanced. rng() returns [0, 1).
export function makeBracketString(rng, balancedWanted) {
  const length = 8 + 2 * Math.floor(rng() * 3);
  const s = balancedString(rng, length / 2);
  if (balancedWanted) return s;
  const all = [...OPENERS, ...CLOSERS];
  for (let attempt = 0; attempt < 60; attempt++) {
    const i = Math.floor(rng() * s.length);
    const t = s.slice(0, i) + rngPick(rng, all) + s.slice(i + 1);
    if (!isBalanced(t)) return t;
  }
  return s.slice(1) + '(';
}

// Speed bonus for a prediction made after `elapsed` seconds.
export const speedBonus = elapsed =>
  Math.round(SPEED_BONUS * Math.max(0, Math.min(1, 1 - elapsed / DECISION_SECONDS)));

export default {
  id: 'stack-attack',
  name: 'Stack Attack',
  icon: '▤',
  color: '#d7ae7d',
  tagline: 'Call which block leaves the stack, queue, or deque next, then judge a bracket string.',
  skills: 'Stacks · queues · deques · brackets',
  start(host, api) {
    let alive = true;
    const timers = new Set();
    let ticker = null;
    let onKey = null;

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const stopTicker = () => {
      clearInterval(ticker);
      ticker = null;
    };
    const teardown = () => {
      stopTicker();
      for (const id of timers) clearTimeout(id);
      timers.clear();
      if (onKey) {
        document.removeEventListener('keydown', onKey);
        onKey = null;
      }
    };

    const showIntro = () =>
      intro(host, {
        title: 'Stack Attack',
        text:
          'Operations arrive one at a time: push, pop, enqueue, dequeue, and for a deque push and pop at either end. ' +
          'Before each removal, click the stored block you think leaves next. A right call scores ' +
          `${CORRECT_POINTS} plus up to ${SPEED_BONUS} for speed within ${DECISION_SECONDS} seconds. A wrong call costs ` +
          `${WRONG_COST} and the real block flashes. Four structure rounds, then Bracket Blitz: say whether a bracket ` +
          `string is balanced for ${BRACKET_POINTS}. Number keys pick blocks from the left; Y or N answer the blitz.`,
        onStart: play,
      });

    function play() {
      teardown();
      const kinds = ['stack', 'queue', 'deque', Math.random() < 0.5 ? 'stack' : 'queue', 'brackets'];
      let round = 0;
      let score = 0;
      let predictions = 0;
      let correct = 0;
      let bracketRight = false;
      let decision = null;
      let list = [];
      let output = [];

      const board = el('div', { class: 'game-board' });
      host.replaceChildren(board);
      const update = hud(board, [
        { id: 'round', label: 'ROUND' },
        { id: 'structure', label: 'STRUCTURE' },
        { id: 'score', label: 'SCORE' },
        { id: 'correct', label: 'CALLS' },
      ]);
      const prompt = el('p', { class: 'game-prompt' });
      const timerFill = el('div', { class: 'timer-fill', style: 'width:0%' });
      const timerBar = el('div', { class: 'timer-bar' }, timerFill);
      const ends = el('div', { class: 'struct-ends' });
      const chips = el('div', { class: 'queue-row' });
      const outputChips = el('div', { class: 'queue-row' });
      const outputLabel = el('div', { class: 'struct-ends' }, el('span', { text: 'OUTPUT' }));
      const log = el('div', { class: 'op-log' });
      const optionsHost = el('div');
      board.append(prompt, timerBar, ends, chips, outputLabel, outputChips, log, optionsHost);
      timerBar.hidden = true;

      onKey = e => {
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (decision) {
          if (!/^[1-9]$/.test(k)) return;
          const button = chips.querySelectorAll('button.big-chip')[Number(k) - 1];
          if (!button) return;
          e.preventDefault();
          button.click();
          return;
        }
        const answers = optionsHost.querySelectorAll('button.answer');
        if (!answers.length) return;
        const i = k === '1' || k === 'y' || k === 'a' ? 0 : k === '2' || k === 'n' || k === 'b' ? 1 : -1;
        if (i < 0) return;
        e.preventDefault();
        answers[i].click();
      };
      document.addEventListener('keydown', onKey);

      const render = (highlight = null) => {
        chips.replaceChildren(
          ...list.map(value =>
            el(
              'button',
              {
                class: `big-chip${value === highlight ? ' active' : ''}`,
                type: 'button',
                dataset: { value },
                onclick: () => choose(value),
              },
              String(value)
            )
          )
        );
        if (!list.length) chips.append(el('span', { class: 'big-chip ghost', text: '·' }));
        outputChips.replaceChildren(
          ...output.map(value => el('span', { class: 'big-chip ghost', text: String(value) }))
        );
        if (!output.length) outputChips.append(el('span', { class: 'big-chip ghost', text: '·' }));
      };

      const chipFor = value => chips.querySelector(`button.big-chip[data-value="${value}"]`);

      function nextRound() {
        round++;
        const kind = kinds[round - 1];
        update({ round: `${round} / ${kinds.length}`, structure: STRUCTURE_NAMES[kind], score });
        if (kind === 'brackets') {
          bracketRound();
          return;
        }
        const { ops } = makeOps(Math.random, kind);
        list = [];
        output = [];
        let i = 0;
        const done = [];
        ends.replaceChildren(el('span', { text: ENDS[kind][0] }), el('span', { text: ENDS[kind][1] }));
        log.textContent = '';
        render();
        prompt.textContent = `A ${kind} appears. Watch the operations.`;

        const step = () => {
          if (i >= ops.length) {
            prompt.textContent = 'Round clear.';
            later(nextRound, 1000);
            return;
          }
          const op = ops[i++];
          if (!op.removes) {
            applyOp(list, op);
            done.push(op.label);
            log.textContent = done.join(' · ');
            render(op.value);
            prompt.textContent = op.label;
            sound.place();
            later(step, 800);
            return;
          }
          const expected = applyOp([...list], op);
          prompt.textContent = `${op.label}: which block leaves? Click it.`;
          startDecision(op, expected, () => {
            done.push(`${op.label} → ${expected}`);
            log.textContent = done.join(' · ');
            applyOp(list, op);
            output.push(expected);
            render();
            later(step, 600);
          });
        };
        later(step, 700);
      }

      function startDecision(op, expected, then) {
        const started = performance.now();
        decision = { op, expected, started, then };
        timerBar.hidden = false;
        timerFill.style.width = '100%';
        ticker = setInterval(() => {
          const left = Math.max(0, DECISION_SECONDS - (performance.now() - started) / 1000);
          timerFill.style.width = `${(left / DECISION_SECONDS) * 100}%`;
          if (left <= 0) resolve(null);
        }, 50);
      }

      function choose(value) {
        if (!decision) return;
        resolve(value);
      }

      function resolve(picked) {
        const { op, expected, started, then } = decision;
        decision = null;
        stopTicker();
        timerBar.hidden = true;
        predictions++;
        const elapsed = (performance.now() - started) / 1000;
        const right = chipFor(expected);
        if (picked === expected) {
          const gained = CORRECT_POINTS + speedBonus(elapsed);
          score += gained;
          correct++;
          right?.classList.add('active');
          sound.correct();
          prompt.textContent = `${op.label}: ${expected} leaves. +${gained}.`;
        } else {
          score = Math.max(0, score - WRONG_COST);
          if (picked !== null) chipFor(picked)?.classList.add('wrong');
          right?.classList.add('active');
          sound.wrong();
          prompt.textContent =
            picked === null
              ? `Too slow. ${op.label}: ${expected} leaves. Minus ${WRONG_COST}.`
              : `No. ${op.label}: ${expected} leaves. Minus ${WRONG_COST}.`;
        }
        update({ score, correct: `${correct} / ${predictions}` });
        later(then, 800);
      }

      function bracketRound() {
        const balancedWanted = Math.random() < 0.5;
        const s = makeBracketString(Math.random, balancedWanted);
        const answer = isBalanced(s) ? 0 : 1;
        ends.replaceChildren();
        chips.replaceChildren(el('p', { class: 'bracket-string', text: s }));
        outputLabel.replaceChildren();
        outputChips.replaceChildren();
        log.textContent = '';
        prompt.textContent = 'Bracket Blitz. Is this string balanced?';
        let locked = false;
        optionsHost.replaceChildren(
          optionButtons(['YES, balanced', 'NO, unbalanced'], (i, button) => {
            if (locked) return;
            locked = true;
            const right = i === answer;
            bracketRight = right;
            flash(button, right);
            if (right) score += BRACKET_POINTS;
            else optionsHost.querySelectorAll('button.answer')[answer]?.classList.add('correct');
            update({ score });
            prompt.textContent = right
              ? `Right, it is ${answer === 0 ? 'balanced' : 'unbalanced'}. +${BRACKET_POINTS}.`
              : `It is ${answer === 0 ? 'balanced' : 'unbalanced'}. No bonus.`;
            later(finish, 1200);
          })
        );
      }

      function finish() {
        teardown();
        gameOver(host, {
          gameId: 'stack-attack',
          score,
          summary: `${correct} of ${predictions} calls right, Bracket Blitz ${bracketRight ? 'won' : 'missed'}.`,
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
