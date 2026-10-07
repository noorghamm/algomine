// The lesson workbench: playback, Mine Mode, the crafting book, practice quests and the data editor.
import { topics, definitions, simulate } from './algorithms.mjs';
import { VoxelWorld } from './world.mjs';
import { $, toast, chip, el, shuffle } from './ui.mjs';
import { sound } from './sound.mjs';
import { progress, markCompleted, markQuiz, markMined, award, XP, setFlag } from './progress.mjs';

const state = {
  topic: topics[0],
  lesson: 'bubble',
  values: [],
  target: 6,
  frames: [],
  position: 0,
  timer: null,
  mode: 'watch',
  tab: 'learn',
  quizIndex: 0,
  mine: null, // { asked, correct, mistakes, pending }
};
const datasets = new Map(); // key: lesson id → { values, target }
let world;
const def = () => definitions[state.lesson];
const inputKind = () => def().inputKind || 'numbers';

export const lab = {
  get topic() {
    return state.topic;
  },
  get lesson() {
    return state.lesson;
  },
  get isOpen() {
    return !$('lab').hidden;
  },
  get mode() {
    return state.mode;
  },
  open,
  close,
  play,
  pause,
  step,
  switchTab,
  setDataset(lessonId, values) {
    datasets.set(lessonId, { values: [...values], target: datasets.get(lessonId)?.target });
  },
  world: () => world,
};

export function initLab() {
  world = new VoxelWorld($('world'), {
    interactive: true,
    onInspect: hit => {
      if (state.mode === 'mine' && state.mine?.pending) {
        const ask = state.mine.pending;
        if (ask.kind === 'index' || ask.kind === 'node') answer(hit.index);
        return;
      }
      const isNode = ['tree', 'forest', 'graph'].includes(def().view || state.topic.view);
      toast(
        `Block ${hit.value} · ${isNode ? 'node' : 'index'} ${isNode && state.topic.id === 'graph' ? hit.value : hit.index}`
      );
    },
  });
  $('play').onclick = play;
  $('step').onclick = () => step(1);
  $('back').onclick = () => step(-1);
  $('reset').onclick = () => {
    pause();
    moveTo(0, false);
    if (state.mode === 'mine') startMine();
  };
  $('timeline').oninput = e => {
    pause();
    moveTo(Number(e.target.value));
  };
  $('speed').onchange = () => {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = setTimeout(tick, delay());
    }
  };
  $('shuffle').onclick = () => {
    state.values = randomValues();
    datasets.set(state.lesson, { values: [...state.values], target: state.target });
    prepare();
  };
  $('edit').onclick = editData;
  $('cancel').onclick = () => $('dataDialog').close();
  $('apply').onclick = applyData;
  $('dataInput').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyData();
    }
  };
  document.querySelectorAll('[data-preset]').forEach(b => (b.onclick = () => preset(b.dataset.preset)));
  document.querySelectorAll('[data-tab]').forEach(b => (b.onclick = () => switchTab(b.dataset.tab)));
  $('returnLesson').onclick = () => switchTab('learn');
  $('nextQuestion').onclick = () => {
    state.quizIndex = (state.quizIndex + 1) % def().quiz.length;
    renderPractice();
  };
  $('modeWatch').onclick = () => setMode('watch');
  $('modeMine').onclick = () => setMode('mine');
  $('resetCamera').onclick = () => world.reset();
  $('dayNight').onclick = () => {
    world.night = !world.night;
    $('dayNight').textContent = world.night ? '☀' : '☾';
    $('dayNight').setAttribute('aria-label', world.night ? 'Switch to day' : 'Switch to night');
    if (world.night) setFlag('night');
    world.draw();
  };
  $('algorithm').onchange = e => {
    history.replaceState(null, '', `#world/${state.topic.id}/${e.target.value}`);
    setLesson(e.target.value);
  };
}

function delay() {
  return 850 / Number($('speed').value);
}

function open(topicId, lessonId, options = {}) {
  const next = topics.find(t => t.id === topicId) || topics[0];
  pause();
  state.topic = next;
  $('buildNav').href = `#build/${next.id}`;
  $('library').hidden = true;
  $('lab').hidden = false;
  $('biomeName').textContent = next.name.toUpperCase();
  $('labTitle').textContent = next.name;
  $('labCategory').textContent = next.category.toUpperCase();
  $('sceneCaption').textContent =
    `${next.name.toUpperCase()} // ${String(topics.indexOf(next) + 1).padStart(2, '0')}`;
  $('algorithm').replaceChildren(
    ...next.algorithms.map(id => el('option', { value: id, text: definitions[id].name }))
  );
  world.reset();
  const lesson = next.algorithms.includes(lessonId) ? lessonId : next.algorithms[0];
  setLesson(lesson);
  if (options.mode) setMode(options.mode);
  switchTab(options.tab || 'learn');
  window.scrollTo(0, 0);
}

function close() {
  pause();
  $('lab').hidden = true;
}

function setLesson(id) {
  state.lesson = id;
  state.quizIndex = 0;
  const d = def();
  const saved = datasets.get(id);
  const sample = d.sample;
  const kind = d.inputKind || 'numbers';
  if (saved) {
    state.values = [...saved.values];
    state.target = saved.target ?? defaultTarget();
  } else if (sample) {
    state.values = typeof sample.input === 'string' ? [...sample.input] : [...sample.input];
    state.target = sample.target ?? defaultTarget();
  } else {
    state.values = [...state.topic.values];
    state.target = defaultTarget();
  }
  if (kind === 'numbers' && d.target && typeof state.target !== 'number') state.target = defaultTarget();
  $('algorithm').value = id;
  $('lessonTitle').textContent = d.name;
  $('description').textContent = d.intro;
  $('insight').textContent = d.insight;
  $('timeComplexity').textContent = d.time;
  $('spaceComplexity').textContent = d.space;
  $('edit').hidden = kind === 'fixed';
  $('shuffle').hidden = kind === 'fixed';
  $('edit').textContent = kind === 'text' ? '✎ RUNES' : '▦ INVENTORY';
  $('mineBadge').hidden = !progress.mined.includes(id);
  prepare();
  renderPractice();
  updateBadge();
}

function defaultTarget() {
  const d = def();
  if (d.sample?.target !== undefined) return d.sample.target;
  return state.topic.id === 'tree' ? 10 : 6;
}

function updateBadge() {
  const done = progress.completed.includes(state.lesson),
    mined = progress.mined.includes(state.lesson);
  $('completionBadge').textContent = mined ? '⛏ MINED' : done ? '✓ LESSON EXPLORED' : 'WORLD IN PROGRESS';
  $('mineBadge').hidden = !mined;
}

function prepare() {
  pause();
  const input = inputKind() === 'text' ? state.values.join('') : state.values;
  state.frames = simulate(state.lesson, input, state.target);
  state.position = 0;
  $('timeline').max = state.frames.length - 1;
  if (state.mode === 'mine') startMine();
  else {
    state.mine = null;
    render();
  }
}

function pause() {
  clearTimeout(state.timer);
  state.timer = null;
  const atEnd = state.position === state.frames.length - 1;
  $('play').textContent = atEnd ? '↺ REPLAY' : '▶ PLAY';
  $('play').setAttribute('aria-label', atEnd ? 'Replay animation' : 'Play animation');
}

function play() {
  if (state.mode === 'mine') {
    step(1);
    return;
  }
  if (state.timer) {
    pause();
    return;
  }
  if (state.position === state.frames.length - 1) moveTo(0, false);
  $('play').textContent = 'Ⅱ PAUSE';
  $('play').setAttribute('aria-label', 'Pause animation');
  state.timer = setTimeout(tick, 100);
}

function tick() {
  if (state.position >= state.frames.length - 1) {
    pause();
    return;
  }
  moveTo(state.position + 1);
  if (state.position === state.frames.length - 1) {
    pause();
    return;
  }
  state.timer = setTimeout(tick, delay());
}

function step(delta) {
  pause();
  if (state.mode === 'mine' && delta > 0 && state.mine?.pending) {
    $('askPanel').classList.add('nudge');
    setTimeout(() => $('askPanel').classList.remove('nudge'), 400);
    return;
  }
  if (state.mode === 'mine' && delta > 0) {
    runToAsk();
    return;
  }
  moveTo(state.position + delta);
  pause();
}

function moveTo(n, awardXp = true) {
  state.position = Math.max(0, Math.min(state.frames.length - 1, n));
  render();
  sound.step(state.position);
  if (awardXp) complete();
}

function complete() {
  if (state.position !== state.frames.length - 1) return;
  if (state.mode === 'mine') finishMine();
  const result = markCompleted(state.lesson);
  if (result) {
    toast(`✦ Lesson explored! +${XP.lesson} XP. Try Mine Mode or the practice quest next.`, 'good');
    updateBadge();
  }
}

function render() {
  const f = state.frames[state.position];
  if (!f) return;
  const d = def();
  $('timeline').value = state.position;
  $('stepCount').textContent = `${state.position} / ${state.frames.length - 1}`;
  $('back').disabled = state.position === 0;
  $('step').disabled = state.position === state.frames.length - 1;
  $('status').textContent = f.message;
  $('statusIcon').textContent = f.complete ? '✓' : '▸';
  $('comparisons').textContent = f.comparisons;
  $('comparisonLabel').textContent = [
    'traverse',
    'inorder',
    'preorder',
    'postorder',
    'bfs',
    'dfs',
    'topo',
  ].includes(state.lesson)
    ? 'NODES VISITED'
    : 'COMPARISONS';
  $('moves').textContent = f.moves;
  $('code').replaceChildren(
    ...d.code.map((text, i) => {
      const line = el('span', { class: `code-line ${i === f.line ? 'highlight' : ''}` });
      line.append(el('b', { text: String(i + 1).padStart(2, '0') }), document.createTextNode(text));
      return line;
    })
  );
  $('targetBadge').hidden = !d.target;
  $('targetBadge').querySelector('b').textContent = state.target;
  $('incomingBadge').hidden = f.incoming === undefined;
  if (f.incoming !== undefined) $('incomingBadge').textContent = `INCOMING: ${f.incoming}`;

  const clickable =
    state.mode === 'mine' && state.mine?.pending && ['index', 'node'].includes(state.mine.pending.kind);
  const stateValues = Array.isArray(f.values) ? f.values : [];
  $('stateValues').replaceChildren(
    ...stateValues.map((value, i) =>
      chip(
        Array.isArray(value) ? value.join(' ') || '·' : value,
        f.active.includes(i)
          ? 'active'
          : f.discarded.includes(i)
            ? 'discarded'
            : f.marked.includes(i)
              ? 'marked'
              : '',
        clickable && state.mine.pending.kind === 'index' && state.mine.pending.tray === undefined
          ? () => answer(i)
          : undefined
      )
    )
  );
  if (!stateValues.length) $('stateValues').innerHTML = '<span class="tray-empty">Empty storage</span>';
  $('trayLabel').textContent =
    state.lesson === 'hash' || state.lesson === 'chaining'
      ? 'CHESTS'
      : state.lesson === 'stack'
        ? 'STACK'
        : state.lesson === 'queue'
          ? 'QUEUE'
          : inputKind() === 'text'
            ? 'RUNES'
            : 'VALUES';
  const isGraph = ['bfs', 'dfs'].includes(state.lesson);
  const auxiliary = isGraph || state.lesson === 'merge' ? f.aux : f.output;
  $('auxTray').hidden = !isGraph && state.lesson !== 'merge' && !auxiliary.length;
  $('auxLabel').textContent = isGraph
    ? state.lesson === 'bfs'
      ? 'QUEUE'
      : 'STACK'
    : state.lesson === 'merge'
      ? 'MERGE BUFFER'
      : 'OUTPUT';
  $('auxValues').replaceChildren(...auxiliary.map(v => chip(v, 'marked')));
  if (!auxiliary.length) $('auxValues').innerHTML = '<span class="tray-empty">Empty</span>';

  const trays = f.trays || [];
  $('trays').replaceChildren(
    ...trays.map((tray, t) =>
      el(
        'div',
        { class: 'aux-tray extra-tray' },
        el('span', { text: tray.label || '' }),
        el(
          'div',
          {},
          ...(tray.values || []).map((v, i) =>
            chip(
              v,
              (tray.active || []).includes(i) ? 'active' : (tray.marked || []).includes(i) ? 'marked' : '',
              clickable && state.mine.pending.kind === 'index' && state.mine.pending.tray === t
                ? () => answer(i)
                : undefined
            )
          ),
          ...(tray.values?.length ? [] : [el('span', { class: 'tray-empty', text: 'Empty' })])
        )
      )
    )
  );
  $('trays').hidden = !trays.length;

  $('algorithmContext').hidden = !f.range;
  $('algorithmContext').textContent = f.range
    ? `RANGE ${f.range[0]}–${f.range[1]} · DEPTH ${f.depth}${f.pivot !== undefined ? ` · PIVOT ${f.values[f.pivot]}` : ''}`
    : '';
  world.set({
    topic: state.topic.id,
    terrain: state.topic.terrain,
    algorithm: state.lesson,
    frame: f,
    view: d.view || state.topic.view,
  });
  if (!state.timer)
    $('play').textContent = state.position === state.frames.length - 1 ? '↺ REPLAY' : '▶ PLAY';
  if (state.mode === 'mine') renderAsk();
}

// ---------- Mine Mode ----------

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  $('modeWatch').setAttribute('aria-pressed', String(mode === 'watch'));
  $('modeMine').setAttribute('aria-pressed', String(mode === 'mine'));
  $('lab').classList.toggle('mine-mode', mode === 'mine');
  $('play').hidden = mode === 'mine';
  $('speedWrap').hidden = mode === 'mine';
  $('step').title = mode === 'mine' ? 'Run to the next decision' : 'Next step';
  pause();
  if (mode === 'mine') startMine();
  else {
    state.mine = null;
    $('askPanel').hidden = true;
    render();
  }
}

function startMine() {
  pause();
  state.mine = {
    asked: 0,
    correct: 0,
    mistakes: 0,
    pending: null,
    answered: new Set(),
    total: state.frames.filter(f => f.ask).length,
  };
  state.position = 0;
  render();
  $('mineHint').hidden = state.mine.total > 0;
  if (state.mine.total > 0) runToAsk();
}

function renderAsk() {
  const f = state.frames[state.position];
  const panel = $('askPanel');
  const m = state.mine;
  if (!m) {
    panel.hidden = true;
    return;
  }
  const ask = f.ask && !m.answered.has(state.position) ? f.ask : null;
  m.pending = ask;
  $('mineScore').textContent = `${m.correct} / ${m.total} CORRECT · ${m.mistakes} MISTAKES`;
  if (!ask) {
    panel.hidden = true;
    $('step').disabled = state.position === state.frames.length - 1;
    return;
  }
  panel.hidden = false;
  $('askPrompt').textContent = ask.prompt;
  $('askFeedback').textContent = '';
  $('askFeedback').className = 'ask-feedback';
  $('step').disabled = true;
  const options = $('askOptions');
  options.replaceChildren();
  if (ask.kind === 'bool') {
    options.append(
      el(
        'button',
        { class: 'answer', type: 'button', onclick: () => answer(true) },
        el('span', { text: 'Y' }),
        'Yes'
      ),
      el(
        'button',
        { class: 'answer', type: 'button', onclick: () => answer(false) },
        el('span', { text: 'N' }),
        'No'
      )
    );
  } else if (ask.kind === 'choice') {
    ask.options.forEach((text, i) =>
      options.append(
        el(
          'button',
          { class: 'answer', type: 'button', onclick: () => answer(i) },
          el('span', { text: String.fromCharCode(65 + i) }),
          text
        )
      )
    );
  } else if (ask.kind === 'index') {
    const source = ask.tray !== undefined ? f.trays?.[ask.tray]?.values || [] : f.values;
    options.append(
      el('p', { class: 'ask-help', text: 'Click a block in the world, a value chip, or pick below.' })
    );
    const row = el('div', { class: 'ask-chips' });
    source.forEach((v, i) =>
      row.append(chip(Array.isArray(v) ? v.join(' ') || '·' : v, '', () => answer(i)))
    );
    options.append(row);
  } else if (ask.kind === 'node') {
    options.append(
      el('p', { class: 'ask-help', text: 'Click a node in the world, or pick its value below.' })
    );
    const row = el('div', { class: 'ask-chips' });
    const nodes = f.nodes?.length ? f.nodes : (f.values || []).map((v, i) => ({ id: i, value: v }));
    nodes.forEach(n => row.append(chip(n.value, '', () => answer(n.id))));
    options.append(row);
  }
}

function answer(given) {
  const m = state.mine;
  const ask = m?.pending;
  if (!ask) return;
  let correct;
  if (ask.kind === 'choice') correct = ask.options[given] === ask.options[ask.answer];
  else correct = given === ask.answer;
  m.answered.add(state.position);
  m.asked++;
  const feedback = $('askFeedback');
  if (correct) {
    m.correct++;
    sound.correct();
    feedback.textContent = 'Correct! Keep digging.';
    feedback.className = 'ask-feedback good';
    award(XP.askCorrect, 'Mine Mode answer');
  } else {
    m.mistakes++;
    sound.wrong();
    const expected =
      ask.kind === 'bool'
        ? ask.answer
          ? 'Yes'
          : 'No'
        : ask.kind === 'choice'
          ? ask.options[ask.answer]
          : ask.kind === 'index'
            ? `index ${ask.answer}`
            : `node ${nodeLabel(ask.answer)}`;
    feedback.textContent = `Not quite. The answer was: ${expected}.`;
    feedback.className = 'ask-feedback bad';
  }
  m.pending = null;
  [...$('askOptions').querySelectorAll('button')].forEach(b => (b.disabled = true));
  $('mineScore').textContent = `${m.correct} / ${m.total} CORRECT · ${m.mistakes} MISTAKES`;
  $('step').disabled = false;
  setTimeout(
    () => {
      if (state.mode === 'mine' && !state.mine?.pending && state.position < state.frames.length - 1)
        moveTo(state.position + 1);
    },
    correct ? 700 : 1600
  );
}

function nodeLabel(id) {
  const f = state.frames[state.position + 1] || state.frames[state.position];
  const n = f.nodes?.find(n => n.id === id);
  return n ? n.value : state.topic.id === 'graph' ? id + 1 : id;
}

function finishMine() {
  const m = state.mine;
  if (!m || m.finished) return;
  m.finished = true;
  const flawless = m.mistakes === 0 && m.total > 0;
  const result = markMined(state.lesson, flawless);
  const earned = result && result.unlocked !== undefined ? '' : '';
  toast(
    flawless
      ? `◆ Flawless! ${m.correct} of ${m.total} right. +${XP.mine + XP.flawless} XP the first time.${earned}`
      : `⛏ Mined! ${m.correct} of ${m.total} right with ${m.mistakes} mistake${m.mistakes === 1 ? '' : 's'}.`,
    'good'
  );
  updateBadge();
}

// ---------- Tabs and practice ----------

function switchTab(name) {
  state.tab = name;
  $('learnPanel').hidden = name !== 'learn';
  $('practicePanel').hidden = name !== 'practice';
  document
    .querySelectorAll('[data-tab]')
    .forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
}

function renderPractice() {
  const quiz = def().quiz;
  state.quizIndex = Math.min(state.quizIndex, quiz.length - 1);
  const q = quiz[state.quizIndex];
  $('question').textContent = q.question;
  $('quizProgress').textContent = `QUESTION ${state.quizIndex + 1} OF ${quiz.length}`;
  $('answerFeedback').textContent = progress.quizzes.includes(state.lesson)
    ? '✓ Quest completed. You can practice again anytime.'
    : '';
  $('nextQuestion').hidden = true;
  $('answers').replaceChildren(
    ...q.answers.map((text, i) => {
      const button = el(
        'button',
        { class: 'answer', type: 'button' },
        el('span', { text: String.fromCharCode(65 + i) }),
        text
      );
      button.onclick = () => {
        const correct = i === q.correct;
        button.classList.toggle('correct', correct);
        button.classList.toggle('incorrect', !correct);
        $('answerFeedback').textContent = correct
          ? `Correct! ${q.reason}`
          : 'Not quite. Revisit the lesson, or try another answer.';
        if (correct) {
          sound.correct();
          [...$('answers').children].forEach(b => (b.disabled = true));
          if (state.quizIndex < quiz.length - 1) $('nextQuestion').hidden = false;
          else {
            const result = markQuiz(state.lesson);
            if (result) toast(`✦ Quest complete! +${XP.quiz} XP.`, 'good');
            $('nextQuestion').hidden = false;
          }
        } else sound.wrong();
      };
      return button;
    })
  );
}

// ---------- Data editing ----------

function randomValues() {
  const kind = inputKind();
  if (kind === 'text') {
    const letters = state.lesson === 'brackets' ? '()[]{}' : 'abcdr';
    const n = 6 + Math.floor(Math.random() * 5);
    if (state.lesson === 'brackets') {
      // Build a mostly balanced string, sometimes broken.
      const pairs = ['()', '[]', '{}'];
      let s = '';
      for (let i = 0; i < Math.ceil(n / 2); i++) {
        const p = pairs[Math.floor(Math.random() * 3)];
        s = Math.random() < 0.5 ? p[0] + s + p[1] : s + p;
      }
      if (Math.random() < 0.3) s = s.slice(0, -1);
      return [...s];
    }
    return Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]);
  }
  const t = state.topic.id;
  const n = t === 'list' ? 5 : ['tree', 'heap', 'balanced'].includes(t) ? 7 : 8;
  const max = t === 'sorting' ? 12 : 20;
  return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * max));
}

function editData() {
  const kind = inputKind();
  const d = def();
  $('dataDialog').classList.toggle('text-mode', kind === 'text');
  $('dataInput').value = kind === 'text' ? state.values.join('') : state.values.join(', ');
  $('targetLabel').hidden = !d.target;
  $('targetInput').type = kind === 'text' ? 'text' : 'number';
  $('targetInput').value = state.target ?? '';
  $('targetText').textContent =
    kind === 'text'
      ? 'PATTERN'
      : state.topic.id === 'list'
        ? state.lesson === 'listInsert'
          ? 'POSITION'
          : 'VALUE TO DELETE'
        : 'SEARCH TARGET';
  $('error').textContent = '';
  const max = ['sorting', 'stack'].includes(state.topic.id) ? 20 : 99;
  $('inputHelp').textContent =
    kind === 'text'
      ? 'Enter 1 to 12 characters: letters, digits or brackets.'
      : `Enter 3–10 whole numbers from 1 to ${max}, separated by commas.`;
  $('dataLabel').textContent = kind === 'text' ? 'RUNES' : 'BLOCK VALUES';
  $('dataNote').textContent =
    state.lesson === 'binary'
      ? 'Binary search sorts your input automatically before searching.'
      : ['tree', 'balanced'].includes(state.topic.id)
        ? 'Values are inserted in this order. Duplicate values are omitted.'
        : state.lesson === 'hash'
          ? 'Chest address = value mod 11. Up to 10 items keep at least one chest empty.'
          : state.lesson === 'chaining'
            ? 'Chest address = value mod 7. Chains grow when values collide.'
            : '';
  $('dataDialog').showModal();
}

function preset(name) {
  if (inputKind() === 'text') {
    const samples = {
      random: randomValues().join(''),
      sorted: 'abcdefg',
      reversed: 'gfedcba',
      duplicates: 'aabbaab',
    };
    $('dataInput').value = samples[name] || randomValues().join('');
    return;
  }
  let a = name === 'duplicates' ? [5, 3, 5, 2, 3, 8] : randomValues();
  if (name === 'sorted') a.sort((x, y) => x - y);
  if (name === 'reversed') a.sort((x, y) => y - x);
  $('dataInput').value = a.join(', ');
}

function applyData() {
  const kind = inputKind();
  const d = def();
  if (kind === 'text') {
    const text = $('dataInput').value.trim();
    if (!/^[A-Za-z0-9()\[\]{}]{1,12}$/.test(text)) {
      $('error').textContent = 'Use 1 to 12 letters, digits or brackets, with no spaces.';
      return;
    }
    const pattern = $('targetInput').value.trim();
    if (d.target && !/^[A-Za-z0-9]{1,8}$/.test(pattern)) {
      $('error').textContent = 'The pattern needs 1 to 8 letters or digits.';
      return;
    }
    state.values = [...text];
    state.target = d.target ? pattern : undefined;
  } else {
    const pieces = $('dataInput')
        .value.split(',')
        .map(x => x.trim()),
      a = pieces.map(Number),
      t = Number($('targetInput').value);
    const max = ['sorting', 'stack'].includes(state.topic.id) ? 20 : 99;
    if (
      pieces.some(p => !p) ||
      a.length < 3 ||
      a.length > 10 ||
      a.some(v => !Number.isInteger(v) || v < 1 || v > max)
    ) {
      $('error').textContent = `Use 3–10 whole numbers between 1 and ${max}, separated by commas.`;
      return;
    }
    if (d.target && (!Number.isInteger(t) || t < 0 || t > 99)) {
      $('error').textContent = 'Choose a whole-number target between 0 and 99.';
      return;
    }
    state.values = a;
    state.target = d.target ? t : state.target;
  }
  datasets.set(state.lesson, { values: [...state.values], target: state.target });
  prepare();
  $('dataDialog').close();
}

export { shuffle };
