import assert from 'node:assert/strict';
import {
  progress,
  levelInfo,
  THRESHOLDS,
  LEVELS,
  award,
  markCompleted,
  markMined,
  recordGame,
  ACHIEVEMENTS,
  resetProgress,
} from '../dist/progress.mjs';

resetProgress();
assert.equal(progress.xp, 0);
assert.equal(levelInfo().level, 0);
assert.equal(levelInfo().title, LEVELS[0]);
for (let i = 1; i < THRESHOLDS.length; i++)
  assert.ok(THRESHOLDS[i] > THRESHOLDS[i - 1], 'thresholds increase');
assert.equal(levelInfo(THRESHOLDS[3]).level, 3);
assert.equal(levelInfo(THRESHOLDS[3] - 1).level, 2);
assert.equal(levelInfo(1e9).max, true);

const first = award(THRESHOLDS[1], 'test');
assert.equal(first.leveled, true);
assert.equal(levelInfo().level, 1);

assert.ok(markCompleted('bubble'));
assert.equal(markCompleted('bubble'), null, 'no double award');
assert.ok(progress.achievements.includes('first-steps'));

const mined = markMined('bubble', true);
assert.ok(mined);
assert.ok(progress.mined.includes('bubble') && progress.flawless.includes('bubble'));
assert.ok(progress.achievements.includes('miner') && progress.achievements.includes('flawless'));

const g1 = recordGame('rush', 300);
assert.equal(g1.isBest, true);
assert.equal(g1.xp, 30);
const g2 = recordGame('rush', 100);
assert.equal(g2.isBest, false);
assert.equal(progress.games.rush.best, 300);
assert.equal(progress.games.rush.plays, 2);
recordGame('rush', 2000);
assert.equal(progress.games.rush.best, 2000);
assert.ok(progress.achievements.includes('high-score'));
assert.ok(progress.achievements.includes('arcade'));

for (const a of ACHIEVEMENTS) assert.ok(a.id && a.name && a.text && typeof a.test === 'function');
assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length, 'unique achievement ids');

resetProgress();
assert.equal(progress.xp, 0);
assert.equal(progress.achievements.length, 0);
console.log('Progress checks passed: levels, awards, achievements, game scores.');
