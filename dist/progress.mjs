// Player progress: XP, levels, streaks, achievements, settings. Saved in this browser.
import { definitions, topics } from './algorithms.mjs';

const KEY = 'algomine-progress-v2';
const LEGACY_KEY = 'blockcraft-journal';
const listeners = new Set();

export const LEVELS = [
  'Newcomer',
  'Dirt Digger',
  'Stone Scout',
  'Copper Crafter',
  'Iron Explorer',
  'Redstone Engineer',
  'Gold Prospector',
  'Diamond Architect',
  'Emerald Sage',
  'Obsidian Master',
  'Beacon Legend',
];
// XP needed to reach each level (cumulative).
export const THRESHOLDS = LEVELS.map((_, i) => (i === 0 ? 0 : 60 * i * (i + 1)));

export const XP = { lesson: 50, quiz: 25, mine: 75, flawless: 25, askCorrect: 2 };

export const ACHIEVEMENTS = [
  {
    id: 'first-steps',
    name: 'First steps',
    icon: '▸',
    text: 'Explore your first lesson.',
    test: p => p.completed.length >= 1,
  },
  {
    id: 'quiz-whiz',
    name: 'Quiz whiz',
    icon: '✦',
    text: 'Complete five knowledge checks.',
    test: p => p.quizzes.length >= 5,
  },
  {
    id: 'miner',
    name: 'Pick it up',
    icon: '⛏',
    text: 'Finish a lesson in Mine Mode.',
    test: p => p.mined.length >= 1,
  },
  {
    id: 'flawless',
    name: 'Flawless run',
    icon: '◆',
    text: 'Finish a Mine Mode run with no mistakes.',
    test: p => p.flawless.length >= 1,
  },
  {
    id: 'arcade',
    name: 'Insert coin',
    icon: '▦',
    text: 'Play any arcade game.',
    test: p => Object.keys(p.games).length >= 1,
  },
  {
    id: 'high-score',
    name: 'Top of the leaderboard',
    icon: '★',
    text: 'Score 500 or more in one arcade game.',
    test: p => Object.values(p.games).some(g => g.best >= 500),
  },
  {
    id: 'streak-3',
    name: 'Three-day streak',
    icon: '☀',
    text: 'Play on three days in a row.',
    test: p => p.streak.count >= 3,
  },
  {
    id: 'streak-7',
    name: 'Week of mining',
    icon: '☀',
    text: 'Play on seven days in a row.',
    test: p => p.streak.count >= 7,
  },
  {
    id: 'builder',
    name: 'Architect',
    icon: '▧',
    text: 'Place fifty blocks in Build Mode.',
    test: p => p.blocksPlaced >= 50,
  },
  {
    id: 'night-owl',
    name: 'Night owl',
    icon: '☾',
    text: 'Switch a world to night.',
    test: p => p.flags.night,
  },
  ...topics.map(t => ({
    id: `world-${t.id}`,
    name: `${t.name} cleared`,
    icon: t.icon,
    text: `Explore every lesson in ${t.name}.`,
    test: p => t.algorithms.length > 0 && t.algorithms.every(id => p.completed.includes(id)),
  })),
  {
    id: 'completionist',
    name: 'Completionist',
    icon: '✓',
    text: 'Explore every lesson in every world.',
    test: p => Object.keys(definitions).every(id => p.completed.includes(id)),
  },
];

const today = () => new Date().toISOString().slice(0, 10);

function fresh() {
  return {
    completed: [],
    quizzes: [],
    mined: [],
    flawless: [],
    games: {},
    xp: 0,
    achievements: [],
    streak: { last: null, count: 0 },
    blocksPlaced: 0,
    flags: {},
    settings: { sound: false, theme: 'dark', motion: 'auto', hints: true },
    forge: {},
  };
}

function load() {
  const p = fresh();
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && typeof legacy === 'object') {
        raw = { completed: legacy.completed, quizzes: legacy.quizzes };
        raw.xp = (raw.completed?.length || 0) * XP.lesson + (raw.quizzes?.length || 0) * XP.quiz;
      }
    }
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return p;
  const ids = list => (Array.isArray(list) ? list.filter(x => typeof x === 'string') : []);
  p.completed = ids(raw.completed);
  p.quizzes = ids(raw.quizzes);
  p.mined = ids(raw.mined);
  p.flawless = ids(raw.flawless);
  p.achievements = ids(raw.achievements);
  p.xp = Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0;
  p.blocksPlaced = Number.isFinite(raw.blocksPlaced) ? raw.blocksPlaced : 0;
  if (raw.games && typeof raw.games === 'object')
    for (const [id, g] of Object.entries(raw.games))
      if (g && Number.isFinite(g.best))
        p.games[id] = { best: g.best, plays: Number.isFinite(g.plays) ? g.plays : 1 };
  if (raw.streak && typeof raw.streak === 'object')
    p.streak = { last: raw.streak.last || null, count: raw.streak.count || 0 };
  if (raw.flags && typeof raw.flags === 'object') p.flags = { ...raw.flags };
  if (raw.settings && typeof raw.settings === 'object') p.settings = { ...p.settings, ...raw.settings };
  if (raw.forge && typeof raw.forge === 'object') p.forge = { ...raw.forge };
  return p;
}

export const progress = load();
export let storageOk = true;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function changed(event = {}) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS)
    if (!progress.achievements.includes(a.id) && a.test(progress)) {
      progress.achievements.push(a.id);
      unlocked.push(a);
    }
  save();
  for (const fn of listeners) fn({ ...event, unlocked });
  return unlocked;
}

export function levelInfo(xp = progress.xp) {
  let level = 0;
  while (level + 1 < THRESHOLDS.length && xp >= THRESHOLDS[level + 1]) level++;
  const floor = THRESHOLDS[level],
    ceiling = THRESHOLDS[level + 1] ?? floor;
  const pct = ceiling > floor ? Math.min(1, (xp - floor) / (ceiling - floor)) : 1;
  return { level, title: LEVELS[level], next: ceiling, floor, pct, max: level === LEVELS.length - 1 };
}

export function award(amount, reason = '') {
  const before = levelInfo().level;
  progress.xp += amount;
  const after = levelInfo().level;
  const unlocked = changed({ type: 'xp', amount, reason, leveled: after > before });
  return { leveled: after > before, level: after, unlocked };
}

export function markCompleted(id) {
  if (progress.completed.includes(id)) return null;
  progress.completed.push(id);
  return award(XP.lesson, `Explored ${definitions[id]?.name || id}`);
}

export function markQuiz(id) {
  if (progress.quizzes.includes(id)) return null;
  progress.quizzes.push(id);
  return award(XP.quiz, 'Knowledge check');
}

export function markMined(id, flawless) {
  let total = 0;
  if (!progress.mined.includes(id)) {
    progress.mined.push(id);
    total += XP.mine;
  }
  if (flawless && !progress.flawless.includes(id)) {
    progress.flawless.push(id);
    total += XP.flawless;
  }
  return total ? award(total, 'Mine Mode') : changed({ type: 'mine' });
}

export function recordGame(gameId, score) {
  const entry = progress.games[gameId] || { best: 0, plays: 0 };
  entry.plays++;
  const isBest = score > entry.best;
  if (isBest) entry.best = score;
  progress.games[gameId] = entry;
  const xp = Math.min(150, Math.round(score / 10));
  const result = xp ? award(xp, 'Arcade') : changed({ type: 'game' });
  return { ...result, isBest, best: entry.best, xp };
}

export function recordBlocks(count) {
  progress.blocksPlaced += count;
  changed({ type: 'build' });
}

export function setFlag(name, value = true) {
  if (progress.flags[name] === value) return;
  progress.flags[name] = value;
  changed({ type: 'flag' });
}

export function setSetting(name, value) {
  progress.settings[name] = value;
  changed({ type: 'settings' });
}

export function recordForge(lessonId, score) {
  const best = progress.forge[lessonId] || 0;
  if (score > best) progress.forge[lessonId] = score;
  changed({ type: 'forge' });
}

export function touchStreak() {
  const now = today(),
    last = progress.streak.last;
  if (last === now) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  progress.streak = { last: now, count: last === yesterday ? progress.streak.count + 1 : 1 };
  changed({ type: 'streak' });
}

export function resetProgress() {
  Object.assign(progress, fresh());
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
  changed({ type: 'reset' });
}

export function exportProgress() {
  return JSON.stringify({ version: 2, exported: new Date().toISOString(), progress }, null, 2);
}

export function importProgress(text) {
  const data = JSON.parse(text);
  const incoming = data?.progress ?? data;
  if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.completed))
    throw new Error('Not an AlgoMine save file.');
  try {
    localStorage.setItem(KEY, JSON.stringify(incoming));
  } catch {}
  Object.assign(progress, load());
  changed({ type: 'import' });
}

export const lessonCount = () => Object.keys(definitions).length;
