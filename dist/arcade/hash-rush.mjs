// Hash Rush: route each incoming value to the chest it hashes to, probing forward on a collision.
import { el, shuffle } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { intro, hud, countdown, gameOver } from './common.mjs';

const ROUNDS = 3;
const PER_ROUND = 7;
const SECONDS = 8;
const CORRECT = 50;
const SPEED_BONUS = 30;
const PENALTY = 15;
const LETTER_KEYS = { q: 10, w: 11, e: 12 };

// Independent linear-probing run. Returns the slot each value lands in and how many
// values found their home chest already taken.
export function probe(values, modulus) {
  const table = Array(modulus).fill(null);
  const placements = [];
  let collisions = 0;
  for (const value of values) {
    let slot = value % modulus;
    if (table[slot] !== null) collisions++;
    while (table[slot] !== null) slot = (slot + 1) % modulus;
    table[slot] = value;
    placements.push(slot);
  }
  return { placements, collisions };
}

// Distinct values from 1 to 99, drawn with `rng` (a function returning 0 to 1), chosen so that
// at least two of them collide under linear probing with `modulus` chests.
export function makeRound(rng, modulus, count = PER_ROUND) {
  const draw = () => {
    const pool = Array.from({ length: 99 }, (_, i) => i + 1);
    const values = [];
    while (values.length < count && pool.length) {
      const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)));
      values.push(pool.splice(i, 1)[0]);
    }
    return values;
  };
  let values = draw();
  for (let attempt = 0; attempt < 200 && probe(values, modulus).collisions < 2; attempt++) values = draw();
  if (probe(values, modulus).collisions < 2) {
    // A stubborn rng: force two later values onto the first value's home chest.
    const first = values[0];
    const twins = [first + modulus, first + 2 * modulus, first - modulus, first - 2 * modulus]
      .filter(v => v >= 1 && v <= 99 && !values.includes(v))
      .slice(0, 2);
    values.splice(1, twins.length, ...twins);
  }
  return { values, placements: probe(values, modulus).placements };
}

// One sentence saying why `value` ends in `slot`.
export function explain(value, modulus, slot) {
  const home = value % modulus;
  if (home === slot) return `${value} mod ${modulus} = ${home}, and chest ${home} is free.`;
  return `${value} mod ${modulus} = ${home}, but chest ${home} is taken. Probe forward to chest ${slot}.`;
}

export default {
  id: 'hash-rush',
  name: 'Hash Rush',
  icon: '▦',
  color: '#c2a4e4',
  tagline: 'Values are pouring in. Send each one to the chest its hash points to before the timer runs out.',
  skills: 'Hashing · linear probing',
  start(host, api) {
    let alive = true;
    let timer = null;
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
    let chests = [];
    let incomingValue, incomingRule, timerHolder, row, hint;

    function reset() {
      Object.assign(state, {
        score: 0,
        streak: 0,
        bestStreak: 0,
        hits: 0,
        total: 0,
        round: 0,
        k: 0,
        modulus: 11,
        moduli: [11, ...shuffle([7, 13])],
        values: [],
        placements: [],
        awaiting: false,
        fraction: 1,
        lastTick: 0,
      });
    }

    const onKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      let index = null;
      if (/^[0-9]$/.test(key)) index = Number(key);
      else if (key in LETTER_KEYS) index = LETTER_KEYS[key];
      if (index === null || index >= state.modulus || !state.awaiting) return;
      e.preventDefault();
      choose(index);
    };

    function showIntro() {
      intro(host, {
        title: 'Hash Rush',
        text:
          'Every value hashes to value mod the number of chests. Click the chest it belongs in. ' +
          'If that chest is already taken, linear probing moves forward to the next free chest and wraps around at the end. ' +
          `Right chest: +${CORRECT} plus up to +${SPEED_BONUS} for speed. Wrong chest: -${PENALTY}. ` +
          'Three rounds of seven values, each with a different number of chests. Keys 0 to 9 and Q, W, E pick chests 0 to 12.',
        onStart: begin,
      });
    }

    function begin() {
      reset();
      host.replaceChildren();
      update = hud(host, [
        { id: 'score', label: 'SCORE' },
        { id: 'round', label: 'ROUND' },
        { id: 'streak', label: 'STREAK' },
      ]);
      incomingValue = el('b', { text: '' });
      incomingRule = el('span', { text: '' });
      timerHolder = el('div');
      row = el('div', { class: 'chest-row' });
      hint = el('p', { class: 'game-prompt', text: '' });
      host.append(
        el('div', { class: 'incoming' }, 'INCOMING', incomingValue, incomingRule),
        timerHolder,
        row,
        hint
      );
      document.addEventListener('keydown', onKey);
      startRound();
    }

    function refreshHud() {
      update({ score: state.score, round: `${state.round + 1}/${ROUNDS}`, streak: state.streak });
    }

    function buildRow() {
      chests = Array.from({ length: state.modulus }, (_, i) =>
        el(
          'button',
          { class: 'chest-slot', type: 'button', 'aria-label': `Chest ${i}`, onclick: () => choose(i) },
          el('small', { text: i }),
          el('span', { text: '' })
        )
      );
      row.style.gridTemplateColumns = `repeat(${state.modulus}, 1fr)`;
      row.replaceChildren(...chests);
    }

    function startRound() {
      state.modulus = state.moduli[state.round];
      const round = makeRound(Math.random, state.modulus);
      state.values = round.values;
      state.placements = round.placements;
      state.k = 0;
      buildRow();
      refreshHud();
      incomingValue.textContent = '';
      incomingRule.textContent = `slot = value mod ${state.modulus}`;
      timerHolder.replaceChildren();
      hint.textContent = `Round ${state.round + 1}: ${state.modulus} chests. Rule: slot = value mod ${state.modulus}.`;
      later(present, 1000);
    }

    function present() {
      const value = state.values[state.k];
      state.awaiting = true;
      state.fraction = 1;
      state.lastTick = SECONDS;
      incomingValue.textContent = value;
      incomingRule.textContent = `slot = ${value} mod ${state.modulus}`;
      hint.textContent = 'Click the chest where it belongs.';
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
        () => resolve(null)
      );
      timerHolder.replaceChildren(timer.bar);
      sound.step(state.k);
    }

    function choose(index) {
      if (!state.awaiting) return;
      resolve(index);
    }

    function flashChest(chest, cls) {
      chest.classList.add(cls);
      later(() => chest.classList.remove(cls), 800);
    }

    function fill(slot, value) {
      chests[slot].classList.add('filled');
      chests[slot].lastChild.textContent = value;
      sound.place();
    }

    function resolve(clicked) {
      if (!state.awaiting) return;
      state.awaiting = false;
      timer?.stop();
      const value = state.values[state.k];
      const slot = state.placements[state.k];
      const ok = clicked === slot;
      state.total++;
      if (ok) {
        const bonus = Math.round(SPEED_BONUS * state.fraction);
        state.score += CORRECT + bonus;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        state.hits++;
        sound.correct();
        flashChest(chests[slot], 'hit');
        hint.textContent = `+${CORRECT + bonus}. ${explain(value, state.modulus, slot)}`;
      } else {
        state.score = Math.max(0, state.score - PENALTY);
        state.streak = 0;
        sound.wrong();
        if (clicked !== null) flashChest(chests[clicked], 'miss');
        flashChest(chests[slot], 'hit');
        const why = clicked === null ? 'Out of time.' : `Chest ${clicked} is wrong.`;
        hint.textContent = `${why} ${explain(value, state.modulus, slot)} Lost ${PENALTY}.`;
      }
      fill(slot, value);
      refreshHud();
      later(next, ok ? 700 : 1600);
    }

    function next() {
      state.k++;
      if (state.k < state.values.length) return present();
      state.round++;
      if (state.round < ROUNDS) return startRound();
      finish();
    }

    function finish() {
      document.removeEventListener('keydown', onKey);
      timer?.stop();
      const score = state.score;
      gameOver(host, {
        gameId: 'hash-rush',
        score,
        summary: `${state.hits} of ${state.total} values went straight into the right chest. Best streak: ${state.bestStreak}.`,
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
      },
    };
  },
};
