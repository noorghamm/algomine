// Arcade hub: a set of short DSA games built from the lesson data.
import { $, el } from '../ui.mjs';
import { progress } from '../progress.mjs';
import { games } from './games.mjs';

let active = null;

export function initArcade() {
  $('arcadeBack').onclick = () => (location.hash = 'arcade');
}

export function openArcade(gameId) {
  $('arcade').hidden = false;
  if (active) {
    active.destroy?.();
    active = null;
  }
  const game = games.find(g => g.id === gameId);
  $('arcadeHub').hidden = !!game;
  $('arcadeStage').hidden = !game;
  if (!game) {
    renderHub();
    return;
  }
  $('arcadeTitle').textContent = game.name;
  $('arcadeTagline').textContent = game.tagline;
  $('arcadeBest').textContent = progress.games[game.id]
    ? `BEST ★ ${progress.games[game.id].best}`
    : 'NO SCORE YET';
  const host = $('arcadeGame');
  host.replaceChildren();
  host.className = `arcade-game game-${game.id}`;
  active = game.start(host, {
    onScore: score => {
      $('arcadeBest').textContent = progress.games[game.id]
        ? `BEST ★ ${progress.games[game.id].best}`
        : `BEST ★ ${score}`;
    },
  });
}

export function closeArcade() {
  if (active) {
    active.destroy?.();
    active = null;
  }
  $('arcade').hidden = true;
}

function renderHub() {
  $('arcadeGrid').replaceChildren(
    ...games.map(game => {
      const best = progress.games[game.id];
      const card = el(
        'a',
        { class: 'game-card', href: `#arcade/${game.id}` },
        el('span', { class: 'game-icon', text: game.icon }),
        el(
          'div',
          { class: 'game-body' },
          el('h3', { text: game.name }),
          el('p', { text: game.tagline }),
          el('small', { text: game.skills })
        ),
        el('span', { class: 'game-best', text: best ? `★ ${best.best}` : 'NEW' })
      );
      card.style.setProperty('--game-color', game.color);
      return card;
    })
  );
}
