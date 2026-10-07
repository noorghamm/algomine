// Complexity Rush: sixty seconds of rapid-fire complexity and "name that algorithm" questions.
import { el } from '../ui.mjs';
import { sound } from '../sound.mjs';
import { lessons as allLessons } from '../algorithms.mjs';
import { intro, hud, countdown, gameOver, optionButtons, flash } from './common.mjs';

export const SECONDS = 60;
export const KINDS = ['time', 'space', 'which'];
// Fallback distractors when the lessons do not offer three distinct complexity strings.
export const POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
export const BASE_POINTS = 50;
export const STREAK_STEP = 10;
export const STREAK_CAP = 50;

// Points for a correct answer when `streak` is the run of consecutive correct answers including this one.
export const pointsFor = streak => BASE_POINTS + Math.min(STREAK_CAP, STREAK_STEP * Math.max(0, streak - 1));

// Two complexity strings count as the same answer when they only differ in spacing or Θ versus O.
const norm = s => String(s).toLowerCase().replace(/\s+/g, '').replace(/θ/g, 'o');

const rngPick = (rng, list) => list[Math.floor(rng() * list.length)];
const rngShuffle = (rng, list) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Pure: build one question from the lesson list. rng() returns [0, 1).
// Returns { kind, lessonId, prompt, detail, options, answer } with four distinct options.
export function makeQuestion(rng, lessons, kind = rngPick(rng, KINDS)) {
  const lesson = rngPick(rng, lessons);
  const others = lessons.filter(l => l !== lesson);
  if (kind === 'which') {
    const seen = new Set([lesson.name]);
    const names = [];
    for (const other of rngShuffle(rng, others)) {
      if (seen.has(other.name)) continue;
      seen.add(other.name);
      names.push(other.name);
      if (names.length === 3) break;
    }
    const options = rngShuffle(rng, [lesson.name, ...names]);
    return {
      kind,
      lessonId: lesson.id,
      prompt: 'Which algorithm is this?',
      detail: lesson.intro,
      options,
      answer: options.indexOf(lesson.name),
    };
  }
  const right = lesson[kind];
  const seen = new Set([norm(right)]);
  const distractors = [];
  for (const other of rngShuffle(rng, others)) {
    const text = other[kind];
    if (!text || seen.has(norm(text))) continue;
    seen.add(norm(text));
    distractors.push(text);
    if (distractors.length === 3) break;
  }
  for (const text of rngShuffle(rng, POOL)) {
    if (distractors.length === 3) break;
    if (seen.has(norm(text))) continue;
    seen.add(norm(text));
    distractors.push(text);
  }
  const options = rngShuffle(rng, [right, ...distractors]);
  return {
    kind,
    lessonId: lesson.id,
    prompt: `${kind === 'time' ? 'Time' : 'Space'} complexity of ${lesson.name}?`,
    detail: '',
    options,
    answer: options.indexOf(right),
  };
}

export default {
  id: 'rush',
  name: 'Complexity Rush',
  icon: 'Ω',
  color: '#ffd27a',
  tagline: 'Sixty seconds. Big O, space, and name that algorithm. How long can you keep the streak?',
  skills: 'Complexity · every lesson',
  start(host, api) {
    let alive = true;
    const timers = new Set();
    let timer = null;
    let onKey = null;

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const teardown = () => {
      for (const id of timers) clearTimeout(id);
      timers.clear();
      timer?.stop();
      timer = null;
      if (onKey) {
        document.removeEventListener('keydown', onKey);
        onKey = null;
      }
    };

    const showIntro = () =>
      intro(host, {
        title: 'Complexity Rush',
        text:
          `${SECONDS} seconds on the clock. Each question asks the time or space complexity of a lesson, or shows ` +
          `a description and asks which algorithm it is. A correct answer scores ${BASE_POINTS}, plus ${STREAK_STEP} ` +
          `per consecutive correct answer up to ${STREAK_CAP}. A wrong answer resets the streak and shows the right ` +
          'answer in green. Keys 1 to 4 or A to D answer.',
        onStart: play,
      });

    function play() {
      teardown();
      let score = 0;
      let streak = 0;
      let best = 0;
      let answered = 0;
      let correct = 0;
      let question = null;
      let locked = false;
      let lastSecond = SECONDS;

      const board = el('div', { class: 'game-board' });
      host.replaceChildren(board);
      const update = hud(board, [
        { id: 'time', label: 'TIME' },
        { id: 'score', label: 'SCORE' },
        { id: 'streak', label: 'STREAK' },
        { id: 'answered', label: 'ANSWERED' },
      ]);
      const prompt = el('p', { class: 'game-prompt' });
      const detail = el('p', { class: 'rush-detail' });
      const optionsHost = el('div');
      timer = countdown(
        SECONDS,
        left => {
          const second = Math.ceil(left);
          if (second !== lastSecond) {
            lastSecond = second;
            if (second <= 5 && second > 0) sound.tick();
          }
          update({ time: second });
        },
        finish
      );
      board.append(timer.bar, prompt, detail, optionsHost);
      update({ time: SECONDS, score, streak, answered });

      onKey = e => {
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key;
        let i = -1;
        if (/^[1-4]$/.test(k)) i = Number(k) - 1;
        else if (/^[a-dA-D]$/.test(k)) i = k.toLowerCase().charCodeAt(0) - 97;
        if (i < 0) return;
        const button = optionsHost.querySelectorAll('button.answer')[i];
        if (!button) return;
        e.preventDefault();
        button.click();
      };
      document.addEventListener('keydown', onKey);

      function next() {
        if (!timer || timer.stopped) return;
        let q = makeQuestion(Math.random, allLessons);
        for (
          let tries = 0;
          tries < 6 && question && q.lessonId === question.lessonId && q.kind === question.kind;
          tries++
        )
          q = makeQuestion(Math.random, allLessons);
        question = q;
        locked = false;
        prompt.textContent = q.prompt;
        detail.textContent = q.detail;
        detail.hidden = !q.detail;
        optionsHost.replaceChildren(optionButtons(q.options, pick));
      }

      function pick(i, button) {
        if (locked || !question) return;
        locked = true;
        answered++;
        if (i === question.answer) {
          streak++;
          best = Math.max(best, streak);
          correct++;
          const gained = pointsFor(streak);
          score += gained;
          flash(button, true);
          button.append(el('span', { class: 'streak-pop', text: ` +${gained}` }));
          update({ score, streak, answered });
          later(next, 350);
        } else {
          streak = 0;
          flash(button, false);
          const right = optionsHost.querySelectorAll('button.answer')[question.answer];
          right?.classList.add('correct');
          update({ score, streak, answered });
          later(next, 600);
        }
      }

      function finish() {
        teardown();
        gameOver(host, {
          gameId: 'rush',
          score,
          summary: `${answered} questions, ${correct} correct, best streak ${best}.`,
          onReplay: play,
        });
        api?.onScore?.(score);
      }

      next();
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
