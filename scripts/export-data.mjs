#!/usr/bin/env node
/**
 * Merges every section into a single data/mythology.json (nodes + deduplicated
 * edges) for use outside the app — e.g. in Gephi, Python or another front end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDGE_TYPES } from '../src/data/meta.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/sections');
const nodes = [];
const ids = new Set();
const edges = [];
const seen = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const n of s.nodes) if (!ids.has(n.id)) { ids.add(n.id); nodes.push({ ...n, section: s.section }); }
  for (const e of s.edges) {
    const t = EDGE_TYPES[e.type];
    if (!t) continue;
    const key = t.directed ? `${e.source}|${e.target}|${e.type}` : `${[e.source, e.target].sort().join('|')}|${e.type}`;
    if (!seen.has(key)) { seen.add(key); edges.push(e); }
  }
}
const valid = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/mythology.json'), JSON.stringify({ nodes, edges: valid }, null, 2));
console.log(`data/mythology.json: ${nodes.length} nodes, ${valid.length} edges`);
