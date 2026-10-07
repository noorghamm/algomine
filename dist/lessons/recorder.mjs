// Recorder: shared working state for a lesson simulation plus the frame log.
// A lesson's run(r) mutates r.a (the working array), r.nodes, r.marked and so on,
// and calls r.emit() whenever the world should show a new step.

export class Recorder {
  constructor(input, target) {
    this.input = [...input];
    this.a = [...input];
    this.target = target;
    this.frames = [];
    this.comparisons = 0;
    this.moves = 0;
    this.marked = [];
    this.discarded = [];
    this.aux = [];
    this.output = [];
    this.nodes = [];
  }

  // Record a frame. `active` holds highlighted indices (or node ids).
  // `extra` can carry view-specific data; see docs/lesson-contract.md.
  emit(message, line = 0, active = [], extra = {}) {
    this.frames.push({
      values: Array.isArray(this.a) ? this.a.map(v => (Array.isArray(v) ? [...v] : v)) : this.a,
      active: [...active],
      marked: [...this.marked],
      discarded: [...this.discarded],
      aux: [...this.aux],
      output: [...this.output],
      comparisons: this.comparisons,
      moves: this.moves,
      message,
      line,
      nodes: this.nodes.map(n => ({ ...n })),
      ...extra,
    });
    return this.frames.at(-1);
  }

  compare(count = 1) {
    this.comparisons += count;
  }

  move(count = 1) {
    this.moves += count;
  }

  swap(i, j) {
    [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
    this.moves++;
  }

  finish() {
    if (!this.frames.length) this.emit('Nothing to show.');
    this.frames.at(-1).complete = true;
    return this.frames;
  }
}

// Build an ask object for Mine Mode. The ask is attached to the frame whose
// *next* frame reveals the answer.
export const ask = (kind, prompt, answer, options) => ({ kind, prompt, answer, ...(options ? { options } : {}) });
