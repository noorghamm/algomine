import { VoxelWorld } from './world.mjs';
import { BuildState, MATERIALS, BUILD_LIMIT, nextToFace } from './build-state.mjs';
import { topics } from './algorithms.mjs';
const $ = id => document.getElementById(id);
const STORAGE = 'algomine-builds-v1';
export class Builder {
  constructor({ onUseDataset }) {
    this.onUseDataset = onUseDataset;
    this.material = 'grass';
    this.tool = 'place';
    this.selection = { x: 0, y: 0 };
    this.models = new Map();
    this.topic = topics[0];
    this.saved = {};
    this.storageAvailable = true;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      if (data?.version === 1 && data.worlds && typeof data.worlds === 'object') this.saved = data.worlds;
    } catch {
      this.storageAvailable = false;
    }
    this.world = new VoxelWorld($('buildCanvas'), {
      interactive: true,
      onBuildAction: hit => this.actOnFace(hit),
      onBuildHover: hit => {
        $('buildAim').textContent = hit
          ? `${this.tool === 'mine' ? 'Mine' : 'Place'} · X ${hit.block.x} · Y ${hit.block.y}`
          : 'Point at a block face, or use the coordinate controls.';
      },
    });
    $('buildPalette').replaceChildren(
      ...MATERIALS.map((m, i) => {
        const button = document.createElement('button');
        button.className = 'material-slot';
        button.type = 'button';
        button.title = `${m.name} (${i + 1})`;
        button.setAttribute('aria-label', `Build with ${m.name}`);
        button.dataset.material = m.id;
        button.innerHTML = `<small>${i + 1}</small><span class="material-cube" style="--material:${m.color}"></span><span>${m.name}</span>`;
        button.onclick = () => {
          this.material = m.id;
          this.tool = 'place';
          this.refresh();
        };
        return button;
      })
    );
    $('buildToolPlace').onclick = () => {
      this.tool = 'place';
      this.refresh();
    };
    $('buildToolMine').onclick = () => {
      this.tool = 'mine';
      this.refresh();
    };
    $('buildUndo').onclick = () => this.history('undo');
    $('buildRedo').onclick = () => this.history('redo');
    $('buildClear').onclick = () => {
      if (this.model.clear()) this.changed('Plot cleared. Undo restores your build.');
    };
    $('buildApply').onclick = () => this.actAtCursor();
    for (const name of ['x', 'y']) {
      const input = $(`build${name.toUpperCase()}`);
      input.replaceChildren(
        ...Array.from({ length: 9 }, (_, i) => {
          const option = document.createElement('option');
          option.value = i - 4;
          option.textContent = i - 4;
          return option;
        })
      );
      input.onchange = () => {
        this.selection[name] = Number(input.value);
        this.world.buildHover = null;
        this.refresh();
      };
    }
    $('buildResetCamera').onclick = () => this.world.reset();
    $('buildDayNight').onclick = () => {
      this.world.night = !this.world.night;
      $('buildDayNight').textContent = this.world.night ? '☀ DAY' : '☾ NIGHT';
      this.world.draw();
    };
    $('buildBiome').replaceChildren(
      ...topics.map(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.name;
        return option;
      })
    );
    $('buildBiome').onchange = e => (location.hash = `build/${e.target.value}`);
    $('buildSort').onclick = () => {
      const heights = this.model.skyline();
      if (heights.length < 3 || heights.length > 10) {
        this.message('Build 3–10 occupied columns to use their heights as sorting data.');
        return;
      }
      this.onUseDataset(heights);
    };
    $('buildCanvas').addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          this.history(e.shiftKey ? 'redo' : 'undo');
        }
        return;
      }
      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        const [x, y] = dirs[e.key];
        this.selection.x = Math.max(-4, Math.min(4, this.selection.x + x));
        this.selection.y = Math.max(-4, Math.min(4, this.selection.y + y));
        this.world.buildHover = null;
        this.refresh();
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        this.actAtCursor();
      } else if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        this.actAtCursor('mine');
      } else if (/^[1-8]$/.test(e.key)) {
        this.material = MATERIALS[Number(e.key) - 1].id;
        this.tool = 'place';
        this.refresh();
      }
    });
  }
  get model() {
    return this.models.get(this.topic.id);
  }
  open(id) {
    this.topic = topics.find(t => t.id === id) || topics[0];
    if (!this.models.has(this.topic.id))
      this.models.set(this.topic.id, new BuildState(this.saved[this.topic.id]));
    this.selection = { x: 0, y: 0 };
    this.world.buildHover = null;
    this.world.reset();
    $('buildBiome').value = this.topic.id;
    $('buildBack').href = `#world/${this.topic.id}`;
    this.message('Your plot is ready. Pick a material, then click or tap a block face.');
    this.refresh();
  }
  cursor(tool = this.tool) {
    const { x, y } = this.selection;
    return { x, y, z: this.model.top(x, y) + (tool === 'place' ? 1 : 0) };
  }
  message(text) {
    $('buildStatus').textContent = text;
  }
  actOnFace(hit) {
    if (!hit) {
      this.message('Click a visible face on the island to start building.');
      return;
    }
    const target = this.tool === 'mine' ? hit.block : nextToFace(hit);
    const error =
      this.tool === 'mine' ? this.model.remove(target) : this.model.place({ ...target, t: this.material });
    if (error) {
      this.message(error);
      this.world.draw();
      return;
    }
    this.selection = { x: target.x, y: target.y };
    this.changed(this.tool === 'mine' ? 'Block mined.' : 'Block placed.');
  }
  actAtCursor(tool = this.tool) {
    const target = this.cursor(tool);
    const error =
      tool === 'mine' ? this.model.remove(target) : this.model.place({ ...target, t: this.material });
    if (error) {
      this.message(error);
      return;
    }
    this.world.buildHover = null;
    this.changed(tool === 'mine' ? 'Top block mined.' : 'Block placed at the selected column.');
  }
  history(action) {
    if (this.model[action]()) {
      this.world.buildHover = null;
      this.changed(action === 'undo' ? 'Last change undone.' : 'Change restored.');
    }
  }
  changed(text) {
    this.saved = { ...this.saved, [this.topic.id]: this.model.blocks };
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ version: 1, worlds: this.saved }));
      this.storageAvailable = true;
    } catch {
      this.storageAvailable = false;
    }
    this.message(text);
    this.refresh();
  }
  refresh() {
    const model = this.model;
    if (!model) return;
    const cursor = this.cursor();
    this.world.set({
      topic: this.topic.id,
      terrain: this.topic.terrain,
      build: {
        blocks: model.blocks,
        material: this.material,
        tool: this.tool,
        cursor,
        checkPlace: b => model.checkPlace(b),
      },
    });
    $('buildX').value = this.selection.x;
    $('buildY').value = this.selection.y;
    $('buildApply').textContent = this.tool === 'place' ? 'PLACE BLOCK' : 'MINE TOP BLOCK';
    $('buildToolPlace').setAttribute('aria-pressed', String(this.tool === 'place'));
    $('buildToolMine').setAttribute('aria-pressed', String(this.tool === 'mine'));
    document
      .querySelectorAll('[data-material]')
      .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.material === this.material)));
    $('buildUndo').disabled = !model.past.length;
    $('buildRedo').disabled = !model.future.length;
    $('buildClear').disabled = !model.blocks.length;
    $('buildCount').textContent = `${model.blocks.length} / ${BUILD_LIMIT} blocks`;
    $('buildSaved').textContent = this.storageAvailable
      ? 'Saved in this browser'
      : 'Browser storage unavailable · changes last for this session';
    $('buildCursor').textContent =
      `X ${cursor.x} · Y ${cursor.y} · Height ${model.top(cursor.x, cursor.y) + 1} / 6`;
    const heights = model.skyline();
    $('buildHeights').textContent = heights.length
      ? heights.join(', ')
      : 'Place blocks to grow your skyline.';
    $('buildSort').disabled = heights.length < 3 || heights.length > 10;
    $('buildColumnCount').textContent = `${heights.length} occupied columns · use 3–10 for sorting`;
  }
}
