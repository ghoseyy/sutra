#!/usr/bin/env node
/**
 * Regenerates src/data/registry.json from scripts/registry.txt.
 * Line format:  id|Name|category|era      Section header:  @section-id|description
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chunks = [];
const entries = [];
const seen = new Set();
let current = null;
for (const raw of fs.readFileSync(path.join(root, 'scripts/registry.txt'), 'utf8').split('\n')) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (line.startsWith('@')) {
    const [id, description] = line.slice(1).split('|');
    current = id;
    chunks.push({ id, description });
    continue;
  }
  const [id, name, category, era] = line.split('|');
  if (seen.has(id)) throw new Error(`duplicate id in registry.txt: ${id}`);
  seen.add(id);
  entries.push({ id, name, category, era, chunk: current });
}
fs.writeFileSync(path.join(root, 'src/data/registry.json'), JSON.stringify({ chunks, entries }, null, 1));
console.log(`registry.json: ${entries.length} entries in ${chunks.length} sections`);
