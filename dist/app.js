// Bootstrap: routing, home screen, course map, journal, header and global keys.
import { topics, definitions, simulate, makeTree } from './algorithms.mjs';
import { courses } from './courses.mjs';
import { Builder } from './builder.mjs';
import { VoxelWorld } from './world.mjs';
import { $, toast, el } from './ui.mjs';
import { sound } from './sound.mjs';
import {
  progress,
  onChange,
  levelInfo,
  touchStreak,
  setSetting,
  ACHIEVEMENTS,
  lessonCount,
} from './progress.mjs';
import { lab, initLab } from './lab.mjs';
import { initArcade, openArcade, closeArcade } from './arcade/index.mjs';
import { initSettings, openSettings, applyTheme } from './settings.mjs';
import { shareCard } from './share.mjs';

const cards = [];
let filter = 'All worlds';
let selectedCourse = 'ads';
const hotbarItems = {
  sorting: 'pickaxe',
  search: 'compass',
  list: 'rail',
  stack: 'chest',
  tree: 'sapling',
  graph: 'redstone',
  heap: 'diamond',
  hash: 'book',
  balanced: 'leaf',
  strings: 'rune',
  compress: 'anvil',
};

applyTheme(progress.settings.theme);
initLab();
initSettings();
initArcade();
const heroWorld = new VoxelWorld($('heroWorld'));
heroWorld.set({
  topic: 'sorting',
  terrain: 'grass',
  hero: true,
  frame: { values: [3, 6, 4, 9, 5, 7], active: [2, 3], marked: [5], discarded: [] },
});
const builder = new Builder({
  onUseDataset: heights => {
    lab.setDataset('merge', heights);
    location.hash = 'world/sorting/merge';
  },
});

// ---------- Header, XP, level ----------

function updateHeader(event = {}) {
  const info = levelInfo();
  $('xp').textContent = progress.xp;
  $('levelTitle').textContent = info.title.toUpperCase();
  $('levelNumber').textContent = `LVL ${info.level}`;
  $('levelFill').style.width = `${info.pct * 100}%`;
  $('levelBar').title = info.max ? 'Max level reached' : `${progress.xp} / ${info.next} XP to the next level`;
  $('journalCount').textContent = progress.completed.length;
  $('streakBadge').textContent = `☀ ${progress.streak.count}`;
  $('streakBadge').title = `${progress.streak.count}-day streak`;
  const total = lessonCount();
  $('experienceFill').style.width = `${(progress.completed.length / total) * 100}%`;
  $('experienceText').textContent =
    `${progress.completed.length} / ${total} lessons explored · ${progress.mined.length} mined`;
  for (const { topic, card } of cards) {
    const count = topic.algorithms.filter(id => progress.completed.includes(id)).length;
    card.querySelector('.card-status').textContent =
      count === topic.algorithms.length ? '✓ EXPLORED' : topic.level;
    card.querySelector('.card-bottom-label').textContent = count
      ? `${count} / ${topic.algorithms.length} LESSONS COMPLETE`
      : `${topic.algorithms.length} ${topic.algorithms.length === 1 ? 'LESSON' : 'LESSONS'} · EXPLORE`;
  }
  if (event.leveled) {
    sound.levelUp();
    toast(`⬆ Level ${info.level}: ${info.title}!`, 'good');
  }
  for (const a of event.unlocked || [])
    setTimeout(() => toast(`${a.icon} Achievement: ${a.name}`, 'gold'), 600);
}
onChange(updateHeader);

// ---------- Home screen ----------

function buildHome() {
  $('worldCount').textContent = topics.length;
  $('lessonCount').textContent = lessonCount();
  $('filterAllCount').textContent = topics.length;
  $('courseStamp').innerHTML = `${courses.length} COURSE PATHS<br>${lessonCount()} PLAYABLE LESSONS`;
  $('worldHotbar').replaceChildren(
    ...topics.map((topic, i) =>
      el(
        'a',
        { class: 'inventory-slot', href: `#world/${topic.id}`, title: topic.name, 'aria-label': topic.name },
        el('span', { class: 'slot-number', text: i + 1 }),
        el('img', { src: `assets/${hotbarItems[topic.id] || 'book'}.svg`, alt: '' }),
        el('span', { class: 'slot-label', text: topic.subject })
      )
    )
  );
  topics.forEach((topic, i) => {
    const card = el('a', {
      class: 'topic-card',
      href: `#world/${topic.id}`,
      'aria-label': `${topic.name}: ${topic.subject}`,
    });
    card.style.setProperty('--card-color', topic.color);
    card.innerHTML = `<div class="card-image"><canvas aria-hidden="true"></canvas><span class="card-number">${String(i + 1).padStart(2, '0')}</span><span class="card-status"></span></div><div class="card-body"><span class="card-subject">${topic.subject}</span><h3>${topic.name}</h3><p>${topic.description}</p><div class="card-bottom"><span class="card-bottom-label"></span><b>→</b></div></div>`;
    $('topicGrid').append(card);
    const view = new VoxelWorld(card.querySelector('canvas'));
    view.set({ topic: topic.id, terrain: topic.terrain, thumbnail: true, ...thumbnailFrame(topic) });
    cards.push({ topic, card, view });
  });
  updateHeader();
}

function thumbnailFrame(topic) {
  const first = topic.algorithms[0];
  const d = first && definitions[first];
  const base = { values: [...topic.values], active: [], marked: [], discarded: [], nodes: [] };
  try {
    if (topic.id === 'sorting') return { frame: { ...base, values: [3, 7, 4, 9, 6] }, view: 'bars' };
    if (topic.id === 'stack') return { frame: { ...base, values: [4, 7, 2, 9] }, view: 'stack' };
    if (topic.id === 'tree') return { frame: { ...base, nodes: makeTree(topic.values) }, view: 'tree' };
    if (d && (d.sample || ['heap', 'hash', 'graph', 'balanced', 'strings', 'compress'].includes(topic.id))) {
      const input = d.sample ? d.sample.input : topic.values;
      const frames = simulate(first, input, d.sample?.target);
      return { frame: frames.at(-1), view: d.view || topic.view, algorithm: first };
    }
  } catch {}
  return { frame: base, view: topic.view, algorithm: first };
}

function applyFilter() {
  const q = $('topicSearch').value.trim().toLowerCase();
  let count = 0;
  for (const { topic, card, view } of cards) {
    const lessonNames = topic.algorithms.map(id => definitions[id].name).join(' ');
    const show =
      (filter === 'All worlds' || topic.category === filter) &&
      `${topic.name} ${topic.subject} ${topic.tags.join(' ')} ${lessonNames}`.toLowerCase().includes(q);
    card.hidden = !show;
    if (show) {
      count++;
      requestAnimationFrame(() => view.draw());
    }
  }
  $('resultCount').textContent = `${count} ${count === 1 ? 'WORLD' : 'WORLDS'} TO EXPLORE`;
  $('empty').hidden = count !== 0;
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filter);
    b.setAttribute('aria-pressed', b.dataset.filter === filter);
  });
}

function buildCourseMap() {
  const course = courses.find(c => c.id === selectedCourse);
  const host = $('courseMap');
  host.style.setProperty('--course-color', course.color);
  host.innerHTML = `<div class="course-intro"><span class="course-emblem" aria-hidden="true">${course.icon}</span><div><span class="eyebrow">${course.label}</span><h3>${course.name}</h3><p>${course.description}</p><small>${course.source}</small></div></div><div class="chapter-list"></div>`;
  course.chapters.forEach((chapter, index) => {
    const lessons = chapter.lessons.filter(id => definitions[id]);
    const done = lessons.filter(id => progress.completed.includes(id)).length;
    const row = el('details', { class: 'chapter' });
    row.innerHTML = `<summary><span class="chapter-number">${String(index + 1).padStart(2, '0')}</span><span class="chapter-title"><strong>${chapter.name}</strong><small>${chapter.world}</small></span><span class="chapter-status ${lessons.length ? 'available' : ''}">${lessons.length ? `${done} / ${lessons.length} PLAYED` : 'MAPPED'}</span><span class="chapter-expand" aria-hidden="true">+</span></summary><div class="chapter-content"><p>${chapter.summary}</p><p class="chapter-mission"><b>YOUR QUEST</b> ${chapter.mission}</p><div class="chapter-lessons"></div>${chapter.next ? `<p class="chapter-next"><b>Still to build:</b> ${chapter.next}.</p>` : ''}<small class="chapter-source">${chapter.pages}</small></div>`;
    for (const id of lessons) {
      const topic = topics.find(t => t.algorithms.includes(id));
      row.querySelector('.chapter-lessons').append(
        el('a', {
          href: `#world/${topic.id}/${id}`,
          class: `lesson-portal ${progress.completed.includes(id) ? 'done' : ''}`,
          text: `${progress.completed.includes(id) ? '✓ ' : ''}${definitions[id].name} →`,
        })
      );
    }
    host.querySelector('.chapter-list').append(row);
  });
  document
    .querySelectorAll('[data-course]')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.course === selectedCourse)));
}

// ---------- Journal ----------

function showJournal() {
  const host = $('journalEntries');
  host.replaceChildren();
  const info = levelInfo();
  host.append(
    el(
      'div',
      { class: 'journal-summary' },
      el('div', {}, el('strong', { text: progress.xp }), el('span', { text: 'XP' })),
      el('div', {}, el('strong', { text: info.level }), el('span', { text: info.title })),
      el('div', {}, el('strong', { text: progress.completed.length }), el('span', { text: 'explored' })),
      el('div', {}, el('strong', { text: progress.mined.length }), el('span', { text: 'mined' })),
      el('div', {}, el('strong', { text: progress.quizzes.length }), el('span', { text: 'quests' })),
      el('div', {}, el('strong', { text: progress.streak.count }), el('span', { text: 'day streak' }))
    )
  );
  const badges = el('div', { class: 'badge-grid' });
  for (const a of ACHIEVEMENTS) {
    const got = progress.achievements.includes(a.id);
    badges.append(
      el(
        'div',
        { class: `badge ${got ? 'earned' : ''}`, title: a.text },
        el('span', { text: a.icon }),
        el('b', { text: a.name }),
        el('small', { text: a.text })
      )
    );
  }
  host.append(
    el('h3', { text: `Achievements · ${progress.achievements.length} / ${ACHIEVEMENTS.length}` }),
    badges
  );
  const games = Object.entries(progress.games);
  if (games.length) {
    host.append(el('h3', { text: 'Arcade best scores' }));
    for (const [id, g] of games)
      host.append(
        el(
          'div',
          { class: 'journal-entry' },
          el('div', {}, el('strong', { text: id }), el('small', { text: `${g.plays} plays` })),
          el('span', { text: `★ ${g.best}` })
        )
      );
  }
  host.append(el('h3', { text: 'Lessons' }));
  if (!progress.completed.length && !progress.quizzes.length)
    host.append(
      el('p', {
        text: 'Your journal is waiting for its first adventure. Finish an animation, mine a lesson, or solve a practice quest.',
      })
    );
  for (const topic of topics)
    for (const id of topic.algorithms) {
      if (!progress.completed.includes(id) && !progress.quizzes.includes(id) && !progress.mined.includes(id))
        continue;
      const row = el(
        'a',
        { class: 'journal-entry', href: `#world/${topic.id}/${id}` },
        el('div', {}, el('strong', { text: definitions[id].name }), el('small', { text: topic.name })),
        el('span', {
          text: `${progress.completed.includes(id) ? '✓ EXPLORED ' : ''}${progress.mined.includes(id) ? '⛏ MINED ' : ''}${progress.quizzes.includes(id) ? '✦ QUEST' : ''}`,
        })
      );
      row.onclick = () => $('journalDialog').close();
      host.append(row);
    }
  $('journalDialog').showModal();
}

// ---------- Routing ----------

function showHome() {
  lab.close();
  closeArcade();
  $('builder').hidden = true;
  $('library').hidden = false;
  setNav('libraryLink');
  applyFilter();
  requestAnimationFrame(() => {
    heroWorld.draw();
    if (location.hash === '#courses') $('courses').scrollIntoView();
  });
}

function setNav(id) {
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.id === id));
}

function route() {
  const hash = location.hash;
  const build = hash.match(/^#build\/([a-z]+)$/);
  const world = hash.match(/^#world\/([a-z]+)(?:\/([A-Za-z]+))?(?:\/(mine))?$/);
  const arcade = hash.match(/^#arcade(?:\/([a-z-]+))?$/);
  $('builder').hidden = !build;
  if (build) {
    lab.close();
    closeArcade();
    $('library').hidden = true;
    setNav('');
    builder.open(build[1]);
    window.scrollTo(0, 0);
    return;
  }
  if (world) {
    closeArcade();
    $('library').hidden = true;
    setNav('');
    lab.open(world[1], world[2], { mode: world[3] ? 'mine' : undefined });
    return;
  }
  if (arcade) {
    lab.close();
    $('library').hidden = true;
    setNav('arcadeLink');
    openArcade(arcade[1]);
    window.scrollTo(0, 0);
    return;
  }
  showHome();
}

// ---------- Wiring ----------

$('start').onclick = () => (location.hash = 'world/sorting');
$('topicSearch').oninput = applyFilter;
document.querySelectorAll('[data-filter]').forEach(
  b =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      applyFilter();
    })
);
document.querySelectorAll('[data-course]').forEach(
  b =>
    (b.onclick = () => {
      selectedCourse = b.dataset.course;
      buildCourseMap();
    })
);
$('practiceNav').onclick = () => {
  if (!lab.isOpen) {
    location.hash = 'world/sorting';
    setTimeout(() => lab.switchTab('practice'), 0);
  } else lab.switchTab('practice');
};
$('journalNav').onclick = showJournal;
$('closeJournal').onclick = () => $('journalDialog').close();
$('shareCard').onclick = async () => {
  const result = await shareCard();
  toast(result === 'shared' ? 'Card shared.' : 'Progress card saved as a PNG.', 'good');
};
$('settingsNav').onclick = openSettings;
$('sound').onclick = () => {
  const on = sound.set(!sound.enabled);
  setSetting('sound', on);
  $('sound').classList.toggle('on', on);
  $('sound').setAttribute('aria-label', on ? 'Disable sound' : 'Enable sound');
  sound.step(0);
  toast(on ? 'Block sounds on' : 'Block sounds off');
};
if (progress.settings.sound) {
  // The browser blocks audio until the first interaction, so arm it lazily.
  const arm = () => {
    sound.set(true);
    $('sound').classList.add('on');
    $('sound').setAttribute('aria-label', 'Disable sound');
    document.removeEventListener('pointerdown', arm);
  };
  document.addEventListener('pointerdown', arm);
  $('sound').classList.add('on');
}

document.addEventListener('keydown', e => {
  const typing =
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
    document.activeElement.isContentEditable;
  if (!$('builder').hidden || document.querySelector('dialog[open]') || typing) return;
  if (e.key === '/' && !$('library').hidden) {
    e.preventDefault();
    $('topicSearch').focus();
    return;
  }
  if (e.key === '?') {
    openSettings('keys');
    return;
  }
  if (!lab.isOpen || document.activeElement.tagName === 'BUTTON') return;
  if (e.code === 'Space') {
    e.preventDefault();
    lab.play();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    lab.step(1);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    lab.step(-1);
  }
  if (e.key.toLowerCase() === 'm') $('modeMine').click();
  if (e.key.toLowerCase() === 'w') $('modeWatch').click();
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) lab.pause();
});
onChange(event => {
  if (event.type === 'xp' || event.type === 'reset' || event.type === 'import') buildCourseMap();
});

touchStreak();
buildCourseMap();
buildHome();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
