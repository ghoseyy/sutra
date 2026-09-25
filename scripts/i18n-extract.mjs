#!/usr/bin/env node
/**
 * Writes the translatable English text of every section to
 * src/data/i18n/_src/<section>.json — the skeleton translators work from.
 *
 * Shape (same as the translated files in src/data/i18n/<lang>/):
 *   { section, nodes: { id: { name, aliases, description, story, symbols, weapons,
 *                              vahana, abode, sources, variations } },
 *              edges: { "source|target|type": { label, variation? } } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/sections');
const out = path.join(root, 'src/data/i18n/_src');
fs.mkdirSync(out, { recursive: true });
const FIELDS = ['name', 'aliases', 'description', 'story', 'symbols', 'weapons', 'vahana', 'abode', 'sources', 'variations'];

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const nodes = {};
  for (const n of s.nodes) nodes[n.id] = Object.fromEntries(FIELDS.map((k) => [k, n[k] ?? null]));
  const edges = {};
  for (const e of s.edges) {
    edges[`${e.source}|${e.target}|${e.type}`] = e.variation ? { label: e.label, variation: e.variation } : { label: e.label };
  }
  fs.writeFileSync(path.join(out, f), JSON.stringify({ section: s.section, nodes, edges }, null, 1));
  const words = JSON.stringify({ nodes, edges }).split(/\s+/).length;
  console.log(`${f}: ${s.nodes.length} nodes, ${Object.keys(edges).length} edges, ~${words} words`);
}
