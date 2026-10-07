// Shared building blocks for arcade games: intro, HUD, countdown timer, game-over screen.
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { recordGame, progress } from '../progress.mjs';

export function intro(host, { title, text, button = 'START', extra = null, onStart }) {
  host.replaceChildren(
    el(
      'div',
      { class: 'game-intro' },
      el('h2', { text: title }),
      el('p', { text }),
      extra,
      el(
        'div',
        { class: 'game-actions' },
        el('button', { class: 'primary', type: 'button', onclick: onStart }, button)
      )
    )
  );
}

// fields: [{ id, label }]. Returns update(values) where values is { id: text }.
export function hud(host, fields) {
  const boxes = {};
  const bar = el(
    'div',
    { class: 'game-hud' },
    ...fields.map(f => {
      const b = el('b', { text: '0' });
      boxes[f.id] = b;
      return el('div', { class: f.id === 'time' ? 'hud-timer' : '' }, f.label, b);
    })
  );
  host.append(bar);
  return values => {
    for (const [id, text] of Object.entries(values)) if (boxes[id]) boxes[id].textContent = text;
  };
}

// Countdown. onTick(secondsLeft, fraction) every 100ms; onEnd when it reaches zero.
export function countdown(seconds, onTick, onEnd) {
  const started = performance.now();
  let stopped = false;
  const bar = el('div', { class: 'timer-bar' }, el('div', { class: 'timer-fill', style: 'width:100%' }));
  const fill = bar.firstChild;
  const id = setInterval(() => {
    if (stopped) return;
    const left = Math.max(0, seconds - (performance.now() - started) / 1000);
    fill.style.width = `${(left / seconds) * 100}%`;
    onTick?.(left, left / seconds);
    if (left <= 0) {
      stop();
      onEnd?.();
    }
  }, 100);
  function stop() {
    stopped = true;
    clearInterval(id);
  }
  return {
    bar,
    stop,
    get stopped() {
      return stopped;
    },
  };
}

export function gameOver(host, { gameId, score, summary, onReplay, onExit }) {
  const result = recordGame(gameId, score);
  if (result.isBest && score > 0) sound.levelUp();
  else sound.correct();
  host.replaceChildren(
    el(
      'div',
      { class: 'game-over' },
      el('h2', { text: result.isBest && score > 0 ? 'New best!' : 'Run complete' }),
      el('div', { class: 'score', text: score }),
      el('div', { class: 'best', text: `BEST ★ ${result.best} · +${result.xp} XP` }),
      el('p', { text: summary }),
      el(
        'div',
        { class: 'game-actions' },
        el('button', { class: 'primary', type: 'button', onclick: onReplay }, '↺ PLAY AGAIN'),
        el(
          'button',
          { class: 'secondary', type: 'button', onclick: onExit || (() => (location.hash = 'arcade')) },
          'ALL GAMES'
        )
      )
    )
  );
  return result;
}

export function optionButtons(options, onPick) {
  return el(
    'div',
    { class: 'game-options' },
    ...options.map((text, i) =>
      el(
        'button',
        { class: 'answer', type: 'button', onclick: e => onPick(i, e.currentTarget) },
        el('span', { text: String.fromCharCode(65 + i) }),
        text
      )
    )
  );
}

export function flash(button, correct) {
  button.classList.add(correct ? 'correct' : 'incorrect');
  if (correct) sound.correct();
  else sound.wrong();
}

export const bestScore = gameId => progress.games[gameId]?.best || 0;
