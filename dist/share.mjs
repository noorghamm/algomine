// Draws a pixel-style progress card to a canvas and offers it as a PNG download or a native share.
import { progress, levelInfo, ACHIEVEMENTS } from './progress.mjs';
import { topics, definitions } from './algorithms.mjs';

function block(ctx, x, y, size, colors) {
  ctx.fillStyle = colors[0];
  ctx.fillRect(x, y, size, size * 0.55);
  ctx.fillStyle = colors[1];
  ctx.fillRect(x, y + size * 0.55, size / 2, size * 0.45);
  ctx.fillStyle = colors[2];
  ctx.fillRect(x + size / 2, y + size * 0.55, size / 2, size * 0.45);
}

export function drawShareCard(canvas) {
  const w = 1200,
    h = 630;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const info = levelInfo();
  ctx.fillStyle = '#161c18';
  ctx.fillRect(0, 0, w, h);
  // Sky band and block skyline from completed lessons per world.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, '#69b4ea');
  sky.addColorStop(1, '#c5e2ea');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.58);
  ctx.fillStyle = '#f5e8b6';
  ctx.fillRect(w - 150, 50, 50, 50);
  const columns = topics.length;
  const colW = Math.floor((w - 120) / columns);
  topics.forEach((t, i) => {
    const done = t.algorithms.filter(id => progress.completed.includes(id)).length;
    const height = done;
    const x = 60 + i * colW + (colW - 48) / 2;
    for (let k = 0; k < height; k++)
      block(ctx, x, h * 0.58 - 48 * (k + 1), 48, [t.color, '#88613f', '#67472e']);
    if (!height) block(ctx, x, h * 0.58 - 48, 48, ['#75b343', '#88613f', '#67472e']);
  });
  ctx.fillStyle = '#88613f';
  ctx.fillRect(0, h * 0.58, w, 26);
  ctx.fillStyle = '#75b343';
  ctx.fillRect(0, h * 0.58 - 8, w, 10);
  ctx.fillStyle = '#1b241c';
  ctx.fillRect(0, h * 0.58 + 26, w, h);
  // Text.
  ctx.fillStyle = '#edf0e3';
  ctx.font = 'bold 54px "Silkscreen", monospace';
  ctx.fillText('ALGOMINE', 60, 110);
  ctx.font = '18px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#1b2b1c';
  ctx.fillText('Learn data structures and algorithms in a world made of blocks.', 60, 145);
  ctx.fillStyle = '#b8ed80';
  ctx.font = 'bold 34px "Silkscreen", monospace';
  ctx.fillText(`LEVEL ${info.level} · ${info.title.toUpperCase()}`, 60, h * 0.58 + 90);
  ctx.fillStyle = '#edf0e3';
  ctx.font = '22px "Space Grotesk", sans-serif';
  const total = Object.keys(definitions).length;
  ctx.fillText(
    `${progress.xp} XP · ${progress.completed.length} / ${total} lessons explored · ${progress.mined.length} mined · ${progress.quizzes.length} quests`,
    60,
    h * 0.58 + 135
  );
  ctx.fillStyle = '#9fb68f';
  ctx.font = '18px "Space Grotesk", sans-serif';
  ctx.fillText(
    `${progress.achievements.length} / ${ACHIEVEMENTS.length} achievements · ${progress.streak.count}-day streak · ${Object.keys(progress.games).length} arcade games played`,
    60,
    h * 0.58 + 170
  );
  ctx.fillStyle = '#eac878';
  ctx.font = '16px "Silkscreen", monospace';
  ctx.fillText('noorghamm.github.io/algomine', 60, h - 36);
  return canvas;
}

export async function shareCard() {
  const canvas = document.createElement('canvas');
  try {
    await document.fonts?.load('54px "Silkscreen"');
    await document.fonts?.load('18px "Space Grotesk"');
  } catch {}
  drawShareCard(canvas);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'algomine-progress.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My AlgoMine progress' });
      return 'shared';
    } catch {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
