// Syntax-check every script in dist and tests without a bundler.
import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(m?js)$/.test(entry.name)) out.push(full);
  }
  return out;
}
const files = [...(await walk('dist')), ...(await walk('tests')), ...(await walk('scripts'))];
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax OK for ${files.length} files.`);
