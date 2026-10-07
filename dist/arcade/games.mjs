// The arcade catalogue. Each game module default-exports
// { id, name, icon, color, tagline, skills, start(host, api) } and a missing file is skipped.
export const manifest = [
  'forge',
  'detective',
  'rush',
  'trace',
  'hash-rush',
  'bst-builder',
  'path-race',
  'stack-attack',
];

const loaded = await Promise.all(
  manifest.map(id =>
    import(`./${id}.mjs`).then(
      m => m.default,
      () => null
    )
  )
);
export const games = loaded.filter(Boolean);
