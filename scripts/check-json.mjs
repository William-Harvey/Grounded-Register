import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules']);
let checked = 0;

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (ignored.has(name)) continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      await walk(full);
    } else if (name.endsWith('.json')) {
      JSON.parse(await readFile(full, 'utf8'));
      checked += 1;
    }
  }
}

await walk(root);
console.log(`Validated ${checked} JSON files.`);
