// Small DOM helpers shared by every screen.
export const $ = id => document.getElementById(id);

let toastTimer;
export function toast(message, kind = '') {
  const el = $('toast');
  el.textContent = message;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 3500);
}

export function chip(value, state = '', onClick) {
  const s = document.createElement(onClick ? 'button' : 'span');
  s.className = `value-chip ${state}`;
  s.textContent = value === null || value === undefined ? '·' : value;
  if (onClick) {
    s.type = 'button';
    s.onclick = onClick;
  }
  return s;
}

export const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node[k] = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(c => c !== null && c !== undefined));
  return node;
};

export const shuffle = list => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const pick = list => list[Math.floor(Math.random() * list.length)];

export const formatTime = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
